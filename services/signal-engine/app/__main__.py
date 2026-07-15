"""Supported local launcher; binds only to the validated loopback setting."""

from __future__ import annotations

import os

import uvicorn

from .main import create_app
from .settings import Settings


def run() -> None:
    settings = Settings.from_env()
    raw_port = os.getenv("SIGNAL_ENGINE_PORT", "8091")
    try:
        port = int(raw_port)
    except ValueError as exc:
        raise ValueError("SIGNAL_ENGINE_PORT must be an integer") from exc
    if not 1_024 <= port <= 65_535:
        raise ValueError("SIGNAL_ENGINE_PORT is outside the local adapter range")
    uvicorn.run(
        create_app(settings=settings),
        host=settings.bind_host,
        port=port,
        access_log=False,
        server_header=False,
    )


if __name__ == "__main__":
    run()
