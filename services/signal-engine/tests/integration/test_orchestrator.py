from __future__ import annotations

import json
from pathlib import Path

from communication_signal_engine.contracts import ProfileId
from communication_signal_engine.orchestrator import CommunicationSignalOrchestrator

from conftest import request_for


def test_end_to_end_closed_contract_and_one_repair() -> None:
    response = CommunicationSignalOrchestrator().analyze(
        request_for("wording_gb_repair", ProfileId.WORDING_SUPPORT)
    )
    payload = response.model_dump(mode="json")
    assert set(payload) == {
        "schema_version",
        "analysis_id",
        "privacy_receipt",
        "cues",
        "repair_action",
        "limitations",
        "low_signal",
        "provenance",
    }
    assert payload["low_signal"] is False
    assert 1 <= len(payload["cues"]) <= 3
    assert set(payload["repair_action"]) == {"title", "editable_text", "rationale"}
    assert payload["provenance"]["semantic_status"] == "abstain_model_not_local"


def test_low_signal_has_null_repair() -> None:
    response = CommunicationSignalOrchestrator().analyze(
        request_for("low_signal_greeting", ProfileId.WORDING_SUPPORT)
    )
    assert response.low_signal is True
    assert response.cues == ()
    assert response.repair_action is None


def test_default_orchestrator_allows_only_attested_synthetic_pattern_checks() -> None:
    orchestrator = CommunicationSignalOrchestrator()
    response = orchestrator.analyze(
        request_for("wording_us_direct", ProfileId.WORDING_SUPPORT)
    )
    assert response.privacy_receipt.local_ner_status == "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY"
    assert response.privacy_receipt.method == "deterministic_patterns_synthetic_fixture_only"


def test_fastify_fastapi_contract_fixture_matches_real_python_output() -> None:
    response = CommunicationSignalOrchestrator().analyze(
        request_for("wording_gb_repair", ProfileId.WORDING_SUPPORT)
    ).model_dump(mode="json")
    response["analysis_id"] = "an_0123456789abcdef01234567"
    fixture_path = (
        Path(__file__).parents[1] / "fixtures" / "fastify_fastapi_contract_response.json"
    )
    assert response == json.loads(fixture_path.read_text(encoding="utf-8"))
