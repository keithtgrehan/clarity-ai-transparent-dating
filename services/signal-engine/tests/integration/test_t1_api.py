from __future__ import annotations

import hashlib
import json
import re
from copy import deepcopy
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Event
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings
from communication_signal_engine.privacy.admission import PrivacyModelAdmission
from communication_signal_engine.contracts_v2 import T1AnalysisResponse, T1ContinueRequest, T1PrepareRequest
from communication_signal_engine.limits import PrivacyBoundaryError
from communication_signal_engine.t1_protocol import T1Protocol
from communication_signal_engine.t1_sessions import T1SessionStore

from conftest import SyntheticMultilingualDetector

SECRET = "synthetic-internal-secret-32-chars-minimum"
HEADERS = {"X-Internal-Service-Secret": SECRET}
PREPARE_PATH = "/internal/v2/communication-analysis/text/prepare"
CONTINUE_PATH = "/internal/v2/communication-analysis/text/continue"
CLEAR_PATH = "/internal/v2/communication-analysis/text/clear"
RAW_CANARY = "rowan.private@example.test"


def _settings(*, enabled: bool = True) -> Settings:
    return Settings(
        environment="test",
        bind_host="127.0.0.1",
        internal_secret=SECRET,
        t1_protocol_enabled=enabled,
        user_authored_text_enabled=enabled,
    )


def _client(*, store: T1SessionStore | None = None, admitted: bool = True) -> TestClient:
    protocol = None
    if admitted:
        protocol = T1Protocol(
            environment="test",
            detector=SyntheticMultilingualDetector(),
            admission=PrivacyModelAdmission.synthetic_test(environment="test"),
            session_store=store,
        )
    return TestClient(
        create_app(_settings(), t1_protocol=protocol),
        raise_server_exceptions=False,
    )


def _prepare_payload(text: str | None = None) -> dict:
    return {
        "schema_version": "2.0.0",
        "task": "draft_review",
        "profile_id": "wording_support",
        "language_tag": "en-EU",
        "text": text or (
            f"My name is Rowan Example. I would like to meet on Saturday afternoon. "
            f"Email {RAW_CANARY} only in this wholly fictional security case."
        ),
        "authority": {"source_class": "self_authored_draft"},
    }


def _prepare(client: TestClient, text: str | None = None) -> dict:
    response = client.post(PREPARE_PATH, json=_prepare_payload(text), headers=HEADERS)
    assert response.status_code == 200, response.text
    return response.json()


def test_t1_routes_are_absent_when_either_flag_is_closed() -> None:
    settings = Settings(environment="test", bind_host="127.0.0.1", internal_secret=SECRET)
    client = TestClient(create_app(settings), raise_server_exceptions=False)
    assert client.post(PREPARE_PATH, json=_prepare_payload(), headers=HEADERS).status_code == 404


def test_prepare_requires_internal_secret_and_approved_privacy_admission() -> None:
    admitted_client = _client()
    assert admitted_client.post(PREPARE_PATH, json=_prepare_payload()).status_code == 401
    assert admitted_client.post(
        PREPARE_PATH,
        json=_prepare_payload(),
        headers={"X-Internal-Service-Secret": "x" * 32},
    ).status_code == 401

    refused = _client(admitted=False).post(PREPARE_PATH, json=_prepare_payload(), headers=HEADERS)
    assert refused.status_code == 503
    assert refused.json() == {
        "error": {
            "code": "PRIVACY_MODEL_UNAVAILABLE",
            "message": "Approved privacy processing is unavailable.",
        }
    }
    assert RAW_CANARY not in refused.text


def test_prepare_returns_only_internal_minimized_review_artifact() -> None:
    response = _client().post(PREPARE_PATH, json=_prepare_payload(), headers=HEADERS)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    payload = response.json()
    assert set(payload) == {
        "schema_version", "internal_nonce", "expires_at", "redacted_preview",
        "potential_identifier_counts", "detector_version", "sanitized_text_bytes",
        "admission_snapshot", "limitation",
    }
    assert payload["schema_version"] == "2.0.0"
    assert re.fullmatch(r"sn_[0-9a-f]{64}", payload["internal_nonce"])
    assert re.fullmatch(r"dv_[0-9a-f]{64}", payload["detector_version"])
    assert re.fullmatch(r"pa_[0-9a-f]{64}", payload["admission_snapshot"])
    assert RAW_CANARY not in response.text
    assert "Rowan Example" not in response.text
    assert "⟦REDACTED_EMAIL⟧" in payload["redacted_preview"]
    assert payload["sanitized_text_bytes"] == len(payload["redacted_preview"].encode("utf-8"))
    assert payload["limitation"] == (
        "Potential identifiers detected by this tool were masked. Indirect or contextual identifiers may remain."
    )


def test_continue_is_single_use_closed_and_has_exact_deterministic_provenance() -> None:
    client = _client()
    prepared = _prepare(client)
    request = {
        "schema_version": "2.0.0",
        "internal_nonce": prepared["internal_nonce"],
        "confirmation": True,
        "admission_snapshot": prepared["admission_snapshot"],
    }
    response = client.post(CONTINUE_PATH, json=request, headers=HEADERS)
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    payload = response.json()
    assert payload["schema_version"] == "2.0.0"
    assert len(payload["cues"]) <= 3
    assert all(set(cue) == {
        "canonical_id", "rule_id", "observation", "limitation", "sanitized_range", "evidence_sufficiency"
    } for cue in payload["cues"])
    assert all(cue["canonical_id"].startswith(("communication.", "structure.")) for cue in payload["cues"])
    assert all(re.fullmatch(r"[a-z][a-z0-9_]{2,79}", cue["rule_id"]) for cue in payload["cues"])
    assert payload["provenance"] == {
        "engine_version": "0.1.0",
        "ruleset_version": "2026-07-15.1",
        "cue_registry_version": "1.0.0",
        "privacy_detector_id": "synthetic-test-double",
        "privacy_detector_revision": "fixture-only",
        "privacy_detector_status": "SYNTHETIC_TEST_DOUBLE_APPLIED",
        "privacy_admission_fingerprint": payload["provenance"]["privacy_admission_fingerprint"],
        "semantic_model_id": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        "semantic_model_revision": "e8f8c211226b894fcb81acc59f3b34ba3efd5f42",
        "semantic_status": "abstain_model_not_local",
    }
    assert re.fullmatch(r"pa_[0-9a-f]{64}", payload["provenance"]["privacy_admission_fingerprint"])
    serialized = json.dumps(payload, sort_keys=True)
    assert RAW_CANARY not in serialized
    assert "Rowan Example" not in serialized
    assert "redacted_preview" not in serialized
    replay = client.post(CONTINUE_PATH, json=request, headers=HEADERS)
    assert replay.status_code == 410
    assert prepared["internal_nonce"] not in replay.text


def test_t1_fastify_contract_fixture_matches_real_python_output() -> None:
    client = _client()
    prepared = _prepare(
        client,
        "Maybe we could meet at the fictional museum, if that works for this wholly fictional example.",
    )
    request = {
        "schema_version": "2.0.0",
        "internal_nonce": prepared["internal_nonce"],
        "confirmation": True,
        "admission_snapshot": prepared["admission_snapshot"],
    }
    with patch(
        "communication_signal_engine.t1_protocol.secrets.token_hex",
        return_value="0123456789abcdef01234567",
    ):
        response = client.post(CONTINUE_PATH, json=request, headers=HEADERS)
    assert response.status_code == 200
    fixture_path = Path(__file__).parents[1] / "fixtures" / "t1_fastify_fastapi_contract_response.json"
    assert response.json() == json.loads(fixture_path.read_text(encoding="utf-8"))


def test_t1_shared_contract_mutations_are_rejected_by_python() -> None:
    fixture_directory = Path(__file__).parents[1] / "fixtures"
    mutations = json.loads(
        (fixture_directory / "t1_contract_mutations.json").read_text(encoding="utf-8")
    )
    base = json.loads((fixture_directory / mutations["base_fixture"]).read_text(encoding="utf-8"))
    T1AnalysisResponse.model_validate_json(json.dumps(base))

    for mutation in mutations["mutations"]:
        candidate = deepcopy(base)
        changes = mutation.get("changes", [mutation])
        for change in changes:
            target = candidate
            for segment in change["path"][:-1]:
                target = target[segment]
            target[change["path"][-1]] = change["value"]
        with pytest.raises(ValueError):
            T1AnalysisResponse.model_validate_json(json.dumps(candidate))


def test_clear_is_idempotent_and_removes_transient_session() -> None:
    client = _client()
    prepared = _prepare(client)
    clear = {"schema_version": "2.0.0", "internal_nonce": prepared["internal_nonce"]}
    assert client.post(CLEAR_PATH, json=clear, headers=HEADERS).status_code == 204
    assert client.post(CLEAR_PATH, json=clear, headers=HEADERS).status_code == 204
    continued = client.post(
        CONTINUE_PATH,
        json={
            "schema_version": "2.0.0",
            "internal_nonce": prepared["internal_nonce"],
            "confirmation": True,
            "admission_snapshot": prepared["admission_snapshot"],
        },
        headers=HEADERS,
    )
    assert continued.status_code == 410


def test_expiry_restart_and_admission_drift_fail_closed() -> None:
    wall_now = [1_000.0]
    monotonic_now = [500.0]
    store = T1SessionStore(
        ttl_seconds=600,
        wall_clock=lambda: wall_now[0],
        monotonic_clock=lambda: monotonic_now[0],
    )
    client = _client(store=store)
    expired = _prepare(client)
    wall_now[0] -= 3_600
    monotonic_now[0] += 601
    request = {
        "schema_version": "2.0.0",
        "internal_nonce": expired["internal_nonce"],
        "confirmation": True,
        "admission_snapshot": expired["admission_snapshot"],
    }
    assert client.post(CONTINUE_PATH, json=request, headers=HEADERS).status_code == 410

    prepared = _prepare(client)
    wrong_snapshot = dict(request, internal_nonce=prepared["internal_nonce"], admission_snapshot="pa_" + "0" * 64)
    assert client.post(CONTINUE_PATH, json=wrong_snapshot, headers=HEADERS).status_code == 503
    assert client.post(CONTINUE_PATH, json=wrong_snapshot, headers=HEADERS).status_code == 410

    restarted_client = _client()
    new_session = _prepare(client)
    restart_request = dict(request, internal_nonce=new_session["internal_nonce"], admission_snapshot=new_session["admission_snapshot"])
    assert restarted_client.post(CONTINUE_PATH, json=restart_request, headers=HEADERS).status_code == 410

    drift_client = _client()
    drifted = _prepare(drift_client)
    drift_request = dict(
        request,
        internal_nonce=drifted["internal_nonce"],
        admission_snapshot=drifted["admission_snapshot"],
    )
    drift_client.app.state.t1_protocol.admission = PrivacyModelAdmission.synthetic_test(
        environment="test",
        version="2.0.0",
    )
    assert drift_client.post(CONTINUE_PATH, json=drift_request, headers=HEADERS).status_code == 503
    assert drift_client.post(CONTINUE_PATH, json=drift_request, headers=HEADERS).status_code == 410


def test_residual_recheck_consumes_terminal_failure() -> None:
    store = T1SessionStore()
    client = _client(store=store)
    prepared = _prepare(client, "I would like to meet on Saturday afternoon in this fictional case.")
    session = store._sessions[prepared["internal_nonce"]]  # synthetic corruption test
    setattr(session.sanitized, "_SanitizedText__content", f"Five safe words then {RAW_CANARY}")
    object.__setattr__(
        session,
        "preview_hash",
        hashlib.sha256(session.sanitized._read_attested().encode("utf-8")).hexdigest(),
    )
    request = {
        "schema_version": "2.0.0",
        "internal_nonce": prepared["internal_nonce"],
        "confirmation": True,
        "admission_snapshot": prepared["admission_snapshot"],
    }
    first = client.post(CONTINUE_PATH, json=request, headers=HEADERS)
    assert first.status_code == 422
    assert RAW_CANARY not in first.text
    assert client.post(CONTINUE_PATH, json=request, headers=HEADERS).status_code == 410


def test_closed_input_errors_and_capacity_have_content_free_statuses() -> None:
    client = _client()
    exact_character_limit = client.post(
        PREPARE_PATH,
        json=_prepare_payload("🙂" * 4_000),
        headers=HEADERS,
    )
    assert exact_character_limit.status_code == 200
    too_large = client.post(PREPARE_PATH, json=_prepare_payload("a" * 4_001), headers=HEADERS)
    assert too_large.status_code == 413
    unsupported = _prepare_payload()
    unsupported["language_tag"] = "en-AU"
    assert client.post(PREPARE_PATH, json=unsupported, headers=HEADERS).status_code == 422
    wrong_source = _prepare_payload()
    wrong_source["authority"] = {"source_class": "received_excerpt"}
    assert client.post(PREPARE_PATH, json=wrong_source, headers=HEADERS).status_code == 400

    constrained = _client(store=T1SessionStore(max_sessions=1))
    _prepare(constrained, "I would like one wholly fictional message reviewed please.")
    capacity = constrained.post(
        PREPARE_PATH,
        json=_prepare_payload("I would prefer another wholly fictional message reviewed please."),
        headers=HEADERS,
    )
    assert capacity.status_code == 429
    assert "fictional message" not in capacity.text

    expanded = _client()
    expansion = expanded.post(PREPARE_PATH, json=_prepare_payload("@a " * 1_333), headers=HEADERS)
    assert expansion.status_code == 422
    assert "@a" not in expansion.text


def test_low_signal_result_contains_no_cue_or_repair() -> None:
    client = _client()
    prepared = _prepare(client, "Hello there.")
    response = client.post(
        CONTINUE_PATH,
        json={
            "schema_version": "2.0.0",
            "internal_nonce": prepared["internal_nonce"],
            "confirmation": True,
            "admission_snapshot": prepared["admission_snapshot"],
        },
        headers=HEADERS,
    )
    assert response.status_code == 200
    assert response.json()["low_signal"] is True
    assert response.json()["cues"] == []
    assert response.json()["repair_action"] is None


def test_raw_canary_is_absent_from_application_logs_and_errors(caplog) -> None:
    client = _client()
    prepared = _prepare(client)
    response = client.post(
        CONTINUE_PATH,
        json={
            "schema_version": "2.0.0",
            "internal_nonce": prepared["internal_nonce"],
            "confirmation": True,
            "admission_snapshot": "pa_" + "f" * 64,
        },
        headers=HEADERS,
    )
    assert response.status_code == 503
    assert RAW_CANARY not in caplog.text
    assert RAW_CANARY not in response.text
    assert prepared["internal_nonce"] not in caplog.text
    assert prepared["internal_nonce"] not in response.text


def test_inflight_python_analysis_observes_clear_revocation_before_release() -> None:
    protocol = T1Protocol(
        environment="test",
        detector=SyntheticMultilingualDetector(),
        admission=PrivacyModelAdmission.synthetic_test(environment="test"),
    )
    prepared = protocol.prepare(T1PrepareRequest.model_validate(_prepare_payload("A fictional review has enough safe words to continue.")))
    entered = Event()
    release = Event()
    original_rules = protocol.rules

    class BlockingRules:
        def analyze(self, sanitized, profile_id):
            entered.set()
            assert release.wait(timeout=2.0)
            return original_rules.analyze(sanitized, profile_id)

    protocol.rules = BlockingRules()
    request = T1ContinueRequest(
        schema_version="2.0.0",
        internal_nonce=prepared.internal_nonce,
        confirmation=True,
        admission_snapshot=prepared.admission_snapshot,
    )
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(protocol.continue_review, request)
        assert entered.wait(timeout=2.0)
        protocol.clear(prepared.internal_nonce)
        release.set()
        with pytest.raises(PrivacyBoundaryError, match="revoked"):
            future.result(timeout=2.0)
    assert protocol.sessions.total_text_bytes == 0
    protocol.sessions.close()
