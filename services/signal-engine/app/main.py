"""FastAPI factory for the private, synthetic-only internal adapter."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from communication_signal_engine.limits import SignalEngineError
from communication_signal_engine.orchestrator import CommunicationSignalOrchestrator

from .routes.v1_analysis import router
from .settings import Settings

MAX_HTTP_BODY_BYTES = 8_192


class BodyLimitMiddleware:
    def __init__(self, app, max_bytes: int) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        declared = headers.get(b"content-length")
        if declared is not None:
            try:
                size = int(declared)
            except ValueError:
                await _error(400, "INVALID_REQUEST", "Request metadata is invalid.")(scope, receive, send)
                return
            if size < 0 or size > self.max_bytes:
                await _error(413, "REQUEST_TOO_LARGE", "Request exceeds the private adapter limit.")(scope, receive, send)
                return
        consumed = 0
        buffered: list[dict] = []
        while True:
            message = await receive()
            buffered.append(message)
            if message.get("type") == "http.request":
                consumed += len(message.get("body", b""))
                if consumed > self.max_bytes:
                    buffered.clear()
                    await _error(413, "REQUEST_TOO_LARGE", "Request exceeds the private adapter limit.")(scope, receive, send)
                    return
                if not message.get("more_body", False):
                    break
            elif message.get("type") == "http.disconnect":
                break

        async def bounded_receive():
            if buffered:
                return buffered.pop(0)
            return {"type": "http.disconnect"}

        try:
            await self.app(scope, bounded_receive, send)
        finally:
            buffered.clear()


def _error(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
        headers={"Cache-Control": "no-store"},
    )


def create_app(
    settings: Settings | None = None,
    orchestrator: CommunicationSignalOrchestrator | None = None,
) -> FastAPI:
    resolved_settings = settings or Settings.from_env()
    resolved_orchestrator = orchestrator or CommunicationSignalOrchestrator()
    app = FastAPI(
        title="Clarity private communication signal adapter",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.state.settings = resolved_settings
    app.state.orchestrator = resolved_orchestrator

    @app.middleware("http")
    async def disable_storage(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    app.add_middleware(BodyLimitMiddleware, max_bytes=MAX_HTTP_BODY_BYTES)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, _exception: RequestValidationError) -> JSONResponse:
        return _error(422, "INVALID_REQUEST", "Request does not match the closed schema.")

    @app.exception_handler(HTTPException)
    async def http_error(_request: Request, error: HTTPException) -> JSONResponse:
        if error.status_code == 401:
            return _error(401, "UNAUTHORIZED", "Internal authentication failed.")
        return _error(error.status_code, "REQUEST_REFUSED", "The request was refused.")

    @app.exception_handler(SignalEngineError)
    async def boundary_error(_request: Request, _exception: SignalEngineError) -> JSONResponse:
        return _error(422, "BOUNDARY_REFUSED", "The bounded analysis request was refused.")

    @app.exception_handler(Exception)
    async def internal_error(_request: Request, _exception: Exception) -> JSONResponse:
        return _error(500, "INTERNAL_ERROR", "Analysis was not released.")

    app.include_router(router)
    return app
