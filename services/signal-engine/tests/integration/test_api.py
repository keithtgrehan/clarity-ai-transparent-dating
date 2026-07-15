from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import Settings
from communication_signal_engine.contracts import ProfileId
from communication_signal_engine.orchestrator import CommunicationSignalOrchestrator

from conftest import request_for

SECRET = "synthetic-internal-secret-32-chars-minimum"


def client(_detector) -> TestClient:
    app = create_app(
        Settings(environment="test", bind_host="127.0.0.1", internal_secret=SECRET),
        CommunicationSignalOrchestrator(),
    )
    return TestClient(app, raise_server_exceptions=False)


def test_private_api_requires_exact_secret(detector) -> None:
    payload = request_for("wording_us_direct", ProfileId.WORDING_SUPPORT).model_dump(mode="json")
    for headers in ({}, {"X-Internal-Service-Secret": "wrong-secret-value-that-is-long"}):
        response = client(detector).post(
            "/internal/v1/communication-analysis/text", json=payload, headers=headers
        )
        assert response.status_code == 401
        assert response.json() == {
            "error": {"code": "UNAUTHORIZED", "message": "Internal authentication failed."}
        }
        assert response.headers["cache-control"] == "no-store"


def test_private_api_success_is_no_store_and_closed(detector) -> None:
    payload = request_for("structure_eu_transition", ProfileId.STRUCTURE_SUPPORT).model_dump(mode="json")
    response = client(detector).post(
        "/internal/v1/communication-analysis/text",
        json=payload,
        headers={"X-Internal-Service-Secret": SECRET},
    )
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["schema_version"] == "1.0.0"
    assert len(response.json()["cues"]) <= 3


def test_settings_refuse_missing_secret_and_non_loopback(monkeypatch) -> None:
    monkeypatch.delenv("SIGNAL_ENGINE_INTERNAL_SECRET", raising=False)
    import pytest

    with pytest.raises(ValueError, match="32 characters"):
        Settings.from_env()
    with pytest.raises(ValueError, match="loopback"):
        Settings(environment="test", bind_host="0.0.0.0", internal_secret=SECRET)
