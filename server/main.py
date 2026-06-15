"""FastAPI app factory + dev entrypoint."""
from __future__ import annotations

import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Populate os.environ from .env so the LangGraph engine's `get_model()` (which
# reads ANTHROPIC_API_KEY via os.environ) sees the same values pydantic-settings
# parses for our own use. The CLI already does this in src/main.py.
load_dotenv()

from . import db  # noqa: E402  (must follow load_dotenv)
from .routers import debates, parties, personas, relationships, stream  # noqa: E402
from .settings import get_settings  # noqa: E402

log = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Revolution — Deliberation Engine API",
        description="HTTP shell over the LangGraph negotiation engine.",
        version="0.1.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def _seed() -> None:
        db.ensure_seeded()

    @app.get("/api/health", tags=["meta"])
    def health() -> dict[str, str]:
        return {"status": "ok", "model": settings.model_name}

    app.include_router(personas.router)
    app.include_router(parties.router)
    app.include_router(relationships.router)
    app.include_router(debates.router)
    app.include_router(stream.router)
    return app


app = create_app()


def run() -> None:
    """Dev entrypoint — `revolution-server` script."""
    import uvicorn

    uvicorn.run("server.main:app", host="127.0.0.1", port=8000, reload=True)
