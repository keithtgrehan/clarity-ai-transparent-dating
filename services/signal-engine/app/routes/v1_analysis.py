"""Authenticated private v1 analysis route for exact synthetic fixtures."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Header, HTTPException, Request, status

from communication_signal_engine.contracts import AnalysisResponse, SyntheticAnalysisRequest

router = APIRouter(prefix="/internal/v1/communication-analysis", tags=["private-synthetic"])


def _authenticate(request: Request, supplied: str | None) -> None:
    expected = request.app.state.settings.internal_secret
    if supplied is None or not secrets.compare_digest(supplied, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


@router.post(
    "/text",
    response_model=AnalysisResponse,
    response_model_exclude_none=False,
    status_code=status.HTTP_200_OK,
)
def analyze_synthetic_text(
    payload: SyntheticAnalysisRequest,
    request: Request,
    x_internal_service_secret: str | None = Header(default=None),
) -> AnalysisResponse:
    _authenticate(request, x_internal_service_secret)
    return request.app.state.orchestrator.analyze(payload)
