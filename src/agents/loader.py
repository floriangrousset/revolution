"""Generic, party-id-driven agent loader.

R2-C generalized the engine to debate any 2+ parties (not just democrat +
republican). Personas now live in `data/personas/<party_id>/<id>.json` — the
file-DB layout owned by `server/db.py`. The legacy bundled location
`src/agents/data/<party>/` is still consulted as a fallback so the CLI can
boot before the web server has seeded `data/`.

Loaded agents are cached per party id; the cache can be cleared with
`reset_loader_cache()` (used by tests).
"""
from __future__ import annotations

import os
from pathlib import Path

from .base import Agent, load_agents, register_agents, validate_relationships

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# Runtime source of truth (writable by the Persona Manager).
_RUNTIME_PERSONAS_DIR = REPO_ROOT / "data" / "personas"
# Read-only seed bundled with the package.
_BUNDLED_PERSONAS_DIR = REPO_ROOT / "src" / "agents" / "data"

_CACHE: dict[str, list[Agent]] = {}


def _use_bundled_only() -> bool:
    """Honor the test-mode env var that forces the bundled persona set.

    Set `REVOLUTION_USE_BUNDLED_PERSONAS=1` in CI or test fixtures to keep
    the agent roster stable regardless of any local edits the developer has
    made to `data/personas/` via the Persona Manager.
    """
    return os.environ.get("REVOLUTION_USE_BUNDLED_PERSONAS") == "1"


def _resolve_party_dir(party_id: str) -> Path:
    """Return the directory holding a party's persona JSON files.

    Prefers the runtime `data/personas/<party>/`; falls back to the bundled
    `src/agents/data/<party>/` when the runtime dir is missing or empty, or
    when `REVOLUTION_USE_BUNDLED_PERSONAS=1` is set.
    """
    if not _use_bundled_only():
        runtime = _RUNTIME_PERSONAS_DIR / party_id
        if runtime.is_dir() and any(runtime.glob("*.json")):
            return runtime
    bundled = _BUNDLED_PERSONAS_DIR / party_id
    if bundled.is_dir() and any(bundled.glob("*.json")):
        return bundled
    # Fall through to the runtime path so the resulting FileNotFoundError /
    # ValueError message points at the location the user is expected to edit.
    return _RUNTIME_PERSONAS_DIR / party_id


def load_party_agents(party_id: str) -> list[Agent]:
    """Load and register all agents for `party_id`. Cached per party.

    Raises:
        ValueError: if no persona JSON files exist for the party.
    """
    if party_id in _CACHE:
        return _CACHE[party_id]
    directory = _resolve_party_dir(party_id)
    if not directory.is_dir():
        raise ValueError(
            f"No persona directory found for party {party_id!r}. "
            f"Expected at {_RUNTIME_PERSONAS_DIR / party_id} "
            f"or {_BUNDLED_PERSONAS_DIR / party_id}."
        )
    agents = load_agents(directory)
    validate_relationships(agents)
    register_agents(agents)
    _CACHE[party_id] = agents
    return agents


def reset_loader_cache() -> None:
    """Drop cached agent lists. Intended for test isolation."""
    _CACHE.clear()
