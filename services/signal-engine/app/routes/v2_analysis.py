"""Disabled-by-default private v2 T1 protocol routes."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Header, HTTPException, Request, Response, status

from communication_signal_engine.contracts_v2 import (
    T1AnalysisResponse,
    T1ClearRequest,
    T1ContinueRequest,
    T1PrepareRequest,
    T1PrepareResponse,
)
from communication_signal_engine.limits import ModelUnavailableError, PrivacyBoundaryError
from communication_signal_engine.t1_sessions import (
    SessionAdmissionChangedError,
    SessionCapacityError,
    SessionUnavailableError,
)

router = APIRouter(prefix="/internal/v2/communication-analysis", tags=["private-t1-readiness"])


class T1HTTPError(Exception):
    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.message = message


def _authenticate(request: Request, supplied: str | None) -> None:
    expected = request.app.state.settings.internal_secret
    if supplied is None or not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


def _protocol_call(operation):
    try:
        return operation()
    except ModelUnavailableError as exc:
        raise T1HTTPError(503, "PRIVACY_MODEL_UNAVAILABLE", "Approved privacy processing is unavailable.") from exc
    except SessionCapacityError as exc:
        raise T1HTTPError(429, "SESSION_CAPACITY_REACHED", "Transient review capacity is unavailable.") from exc
    except SessionUnavailableError as exc:
        raise T1HTTPError(410, "SESSION_UNAVAILABLE", "The review session expired or was already used.") from exc
    except SessionAdmissionChangedError as exc:
        raise T1HTTPError(503, "ADMISSION_CHANGED", "The review session must be prepared again.") from exc
    except PrivacyBoundaryError as exc:
        raise T1HTTPError(422, "PRIVACY_REFUSAL", "Privacy checks could not release this review.") from exc


@router.post("/text/prepare", response_model=T1PrepareResponse, status_code=200)
def prepare_text(
    payload: T1PrepareRequest,
    request: Request,
    x_internal_service_secret: str | None = Header(default=None),
) -> T1PrepareResponse:
    _authenticate(request, x_internal_service_secret)
    return _protocol_call(lambda: request.app.state.t1_protocol.prepare(payload))


@router.post("/text/continue", response_model=T1AnalysisResponse, status_code=200)
def continue_text(
    payload: T1ContinueRequest,
    request: Request,
    x_internal_service_secret: str | None = Header(default=None),
) -> T1AnalysisResponse:
    _authenticate(request, x_internal_service_secret)
    return _protocol_call(lambda: request.app.state.t1_protocol.continue_review(payload))


@router.post("/text/clear", status_code=204)
def clear_text(
    payload: T1ClearRequest,
    request: Request,
    x_internal_service_secret: str | None = Header(default=None),
) -> Response:
    _authenticate(request, x_internal_service_secret)
    request.app.state.t1_protocol.clear(payload.internal_nonce)
    return Response(status_code=204, headers={"Cache-Control": "no-store"})
