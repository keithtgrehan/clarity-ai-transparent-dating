from __future__ import annotations

import asyncio
import json

import pytest
from fastapi.testclient import TestClient

from app.main import BodyLimitMiddleware, create_app
from app.settings import Settings
from communication_signal_engine.contracts import AnalysisResponse, ProfileId
from communication_signal_engine.limits import InputBoundaryError
from communication_signal_engine.orchestrator import CommunicationSignalOrchestrator

from conftest import request_for

SECRET = "synthetic-internal-secret-32-chars-minimum"


def make_client(_detector) -> TestClient:
    return TestClient(
        create_app(
            Settings(environment="test", bind_host="::1", internal_secret=SECRET),
            CommunicationSignalOrchestrator(),
        ),
        raise_server_exceptions=False,
    )


def test_tampered_fixture_refuses_without_echoing_input(detector) -> None:
    payload = request_for("wording_us_direct", ProfileId.WORDING_SUPPORT).model_dump(mode="json")
    secret_surface = "Jordan jordan@example.test @private_handle"
    payload["text"] = secret_surface
    response = make_client(detector).post(
        "/internal/v1/communication-analysis/text",
        json=payload,
        headers={"X-Internal-Service-Secret": SECRET},
    )
    assert response.status_code == 422
    rendered = response.text
    assert "Jordan" not in rendered
    assert "example.test" not in rendered
    assert "private_handle" not in rendered
    assert response.headers["cache-control"] == "no-store"


def test_validation_handler_omits_pydantic_input(detector) -> None:
    secret_surface = "private.person@example.test"
    response = make_client(detector).post(
        "/internal/v1/communication-analysis/text",
        json={"text": secret_surface, "unexpected": secret_surface},
        headers={"X-Internal-Service-Secret": SECRET},
    )
    assert response.status_code == 422
    assert secret_surface not in response.text


def test_body_limit_precedes_json_validation(detector) -> None:
    body = json.dumps({"text": "x" * 9_000})
    response = make_client(detector).post(
        "/internal/v1/communication-analysis/text",
        content=body,
        headers={"content-type": "application/json", "X-Internal-Service-Secret": SECRET},
    )
    assert response.status_code == 413
    assert "x" * 100 not in response.text
    assert response.headers["cache-control"] == "no-store"


def test_output_has_no_text_or_person_inference_fields() -> None:
    response = CommunicationSignalOrchestrator().analyze(
        request_for("wording_gb_repair", ProfileId.WORDING_SUPPORT)
    )
    payload = response.model_dump(mode="json")
    rendered = json.dumps(payload).casefold()
    forbidden_keys = {
        "raw_text", "sanitized_text", "transcript", "snippet", "evidence",
        "diagnosis", "emotion", "attraction", "compatibility", "confidence",
    }

    def keys(value):
        if isinstance(value, dict):
            for key, item in value.items():
                yield key
                yield from keys(item)
        elif isinstance(value, list):
            for item in value:
                yield from keys(item)

    assert forbidden_keys.isdisjoint(set(keys(payload)))
    assert "@" not in rendered


def test_asgi_body_guard_handles_invalid_length_and_chunked_oversize() -> None:
    async def exercise(headers, messages):
        downstream_called = False
        sent = []

        async def downstream(_scope, _receive, send):
            nonlocal downstream_called
            downstream_called = True
            await send({"type": "http.response.start", "status": 204, "headers": []})
            await send({"type": "http.response.body", "body": b""})

        iterator = iter(messages)

        async def receive():
            return next(iterator)

        async def send(message):
            sent.append(message)

        scope = {"type": "http", "headers": headers, "method": "POST", "path": "/"}
        await BodyLimitMiddleware(downstream, 8)(scope, receive, send)
        return downstream_called, sent

    called, sent = asyncio.run(
        exercise([(b"content-length", b"invalid")], [{"type": "http.request", "body": b""}])
    )
    assert called is False
    assert sent[0]["status"] == 400

    called, sent = asyncio.run(
        exercise(
            [],
            [
                {"type": "http.request", "body": b"12345", "more_body": True},
                {"type": "http.request", "body": b"67890", "more_body": False},
            ],
        )
    )
    assert called is False
    assert sent[0]["status"] == 413

    called, sent = asyncio.run(
        exercise([], [{"type": "http.request", "body": b"small", "more_body": False}])
    )
    assert called is True
    assert sent[0]["status"] == 204


def test_every_releasable_string_is_canonical_and_blocks_pii_canaries() -> None:
    orchestrator = CommunicationSignalOrchestrator()
    response = orchestrator.analyze(
        request_for("wording_gb_repair", ProfileId.WORDING_SUPPORT)
    )
    canary = (
        "Jordan Example jordan@example.test +49 30 1234 5678 "
        "DE89 3704 0044 0532 0130 00 198.51.100.23 12 Example Street"
    )
    cue = response.cues[0]
    repair = response.repair_action
    assert repair is not None
    mutations = [
        response.model_copy(update={"cues": (cue.model_copy(update={"observation": canary}),)}),
        response.model_copy(update={"cues": (cue.model_copy(update={"limitation": canary}),)}),
        response.model_copy(update={"repair_action": repair.model_copy(update={"title": canary})}),
        response.model_copy(update={"repair_action": repair.model_copy(update={"editable_text": canary})}),
        response.model_copy(update={"repair_action": repair.model_copy(update={"rationale": canary})}),
        response.model_copy(update={"limitations": (canary,)}),
        response.model_copy(
            update={
                "privacy_receipt": response.privacy_receipt.model_copy(
                    update={"limitation": canary}
                )
            }
        ),
        response.model_copy(
            update={
                "provenance": response.provenance.model_copy(
                    update={"semantic_model_id": canary}
                )
            }
        ),
    ]
    for mutation in mutations:
        with pytest.raises(InputBoundaryError):
            orchestrator._validate_output(mutation)

    with pytest.raises(Exception):
        AnalysisResponse.model_validate(
            {**response.model_dump(mode="json"), "analysis_id": canary}
        )

    payload = response.model_dump(mode="json")
    assert AnalysisResponse.model_validate_json(json.dumps(payload))
    contract_mutations = [
        {**payload, "cues": [{**payload["cues"][0], "canonical_id": "communication.fabricated"}]},
        {**payload, "cues": [{**payload["cues"][0], "observation": canary}]},
        {
            **payload,
            "privacy_receipt": {**payload["privacy_receipt"], "limitation": canary},
        },
        {
            **payload,
            "provenance": {**payload["provenance"], "ruleset_version": "unreviewed"},
        },
        {**payload, "limitations": [canary]},
    ]
    for mutation in contract_mutations:
        with pytest.raises(Exception):
            AnalysisResponse.model_validate_json(json.dumps(mutation))
