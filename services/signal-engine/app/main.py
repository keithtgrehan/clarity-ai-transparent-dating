"""FastAPI factory for the private, synthetic-only internal adapter."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from communication_signal_engine.limits import SignalEngineError
from communication_signal_engine.orchestrator import CommunicationSignalOrchestrator
from communication_signal_engine.t1_protocol import T1Protocol

from .routes.v1_analysis import router
from .routes.v2_analysis import T1HTTPError, router as t1_router
from .settings import Settings

MAX_HTTP_BODY_BYTES = 8_192
MAX_T1_HTTP_BODY_BYTES = 24 * 1_024


class BodyLimitMiddleware:
    def __init__(self, app, max_bytes: int, t1_max_bytes: int | None = None) -> None:
        self.app = app
        self.max_bytes = max_bytes
        self.t1_max_bytes = t1_max_bytes if t1_max_bytes is not None else max_bytes

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        max_bytes = (
            self.t1_max_bytes
            if scope.get("path", "").startswith("/internal/v2/communication-analysis/")
            else self.max_bytes
        )
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        declared = headers.get(b"content-length")
        if declared is not None:
            try:
                size = int(declared)
            except ValueError:
                await _error(400, "INVALID_REQUEST", "Request metadata is invalid.")(scope, receive, send)
                return
            if size < 0 or size > max_bytes:
                await _error(413, "REQUEST_TOO_LARGE", "Request exceeds the private adapter limit.")(scope, receive, send)
                return
        consumed = 0
        buffered: list[dict] = []
        while True:
            message = await receive()
            buffered.append(message)
            if message.get("type") == "http.request":
                consumed += len(message.get("body", b""))
                if consumed > max_bytes:
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
    *,
    t1_protocol: T1Protocol | None = None,
) -> FastAPI:
    resolved_settings = settings or Settings.from_env()
    resolved_orchestrator = orchestrator or CommunicationSignalOrchestrator()
    resolved_t1: T1Protocol | None = None
    if resolved_settings.t1_routes_enabled:
        resolved_t1 = t1_protocol or T1Protocol(environment=resolved_settings.environment)
        if resolved_t1.test_only and resolved_settings.environment != "test":
            raise ValueError("Test-only T1 protocol cannot run outside tests")
    elif t1_protocol is not None:
        raise ValueError("T1 protocol injection requires both explicit T1 feature flags")

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        try:
            yield
        finally:
            if resolved_t1 is not None:
                resolved_t1.sessions.close()

    app = FastAPI(
        title="Clarity private communication signal adapter",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )
    app.state.settings = resolved_settings
    app.state.orchestrator = resolved_orchestrator
    app.state.t1_protocol = resolved_t1

    @app.middleware("http")
    async def disable_storage(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    app.add_middleware(
        BodyLimitMiddleware,
        max_bytes=MAX_HTTP_BODY_BYTES,
        t1_max_bytes=MAX_T1_HTTP_BODY_BYTES,
    )

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
        if request.url.path.startswith("/internal/v2/communication-analysis/"):
            errors = error.errors()
            if any(item.get("type") == "string_too_long" and "text" in item.get("loc", ()) for item in errors):
                return _error(413, "REQUEST_TOO_LARGE", "Request exceeds the transient text limit.")
            if any("language_tag" in item.get("loc", ()) for item in errors):
                return _error(422, "UNSUPPORTED_LANGUAGE", "The declared language metadata is unsupported.")
            return _error(400, "INVALID_REQUEST", "Request does not match the closed T1 schema.")
        return _error(422, "INVALID_REQUEST", "Request does not match the closed schema.")

    @app.exception_handler(T1HTTPError)
    async def t1_error(_request: Request, error: T1HTTPError) -> JSONResponse:
        return _error(error.status_code, error.code, error.message)

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
    if resolved_settings.t1_routes_enabled:
        app.include_router(t1_router)
    return app
