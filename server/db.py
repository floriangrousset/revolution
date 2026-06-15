"""File-DB access layer.

The persona JSON files on disk match the `Agent` dataclass shape verbatim,
so this layer is a thin wrapper around `Agent.from_json` + atomic writes.

Layout (rooted at `Settings.data_dir`):

    data/
    ├── parties.json
    ├── index.json
    ├── personas/<party>/<id>.json
    └── debates/<id>/{debate.json, transcript.jsonl, votes.json, amendments.json}
"""
from __future__ import annotations

import asyncio
import json
import logging
import shutil
from dataclasses import asdict
from pathlib import Path
from typing import Any

from src.agents.base import Agent, validate_relationships

from .settings import REPO_ROOT, get_settings

log = logging.getLogger(__name__)

# Default colors for the two seeded parties. Custom parties pick gold.
_DEFAULT_PARTIES: list[dict[str, Any]] = [
    {"id": "democrat", "label": "Democratic Caucus", "color": "#2E5AA8"},
    {"id": "republican", "label": "Republican Conference", "color": "#C0392B"},
]

# One lock per debate id, lazily created. Protects per-debate file writes.
_debate_locks: dict[str, asyncio.Lock] = {}


def _data_dir() -> Path:
    return get_settings().data_dir


def _personas_dir() -> Path:
    return _data_dir() / "personas"


def _parties_file() -> Path:
    return _data_dir() / "parties.json"


def _debate_lock(debate_id: str) -> asyncio.Lock:
    lock = _debate_locks.get(debate_id)
    if lock is None:
        lock = asyncio.Lock()
        _debate_locks[debate_id] = lock
    return lock


# ---------------------------------------------------------------------------
# Bootstrap: seed personas + parties on first run
# ---------------------------------------------------------------------------

def ensure_seeded() -> None:
    """If `data/personas/` is empty, copy from `src/agents/data/`."""
    data_dir = _data_dir()
    personas_dir = _personas_dir()
    parties_file = _parties_file()

    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "debates").mkdir(parents=True, exist_ok=True)

    if not parties_file.exists():
        _atomic_write_json(parties_file, {"parties": _DEFAULT_PARTIES})
        log.info("seeded parties.json")

    if not personas_dir.exists() or not any(personas_dir.glob("*/*.json")):
        source = REPO_ROOT / "src" / "agents" / "data"
        if source.is_dir():
            personas_dir.mkdir(parents=True, exist_ok=True)
            for party_dir in source.iterdir():
                if party_dir.is_dir():
                    dst = personas_dir / party_dir.name
                    dst.mkdir(parents=True, exist_ok=True)
                    for json_file in party_dir.glob("*.json"):
                        shutil.copy2(json_file, dst / json_file.name)
            log.info("seeded personas/ from src/agents/data/")
        else:
            log.warning("seed source missing: %s", source)


# ---------------------------------------------------------------------------
# Atomic write helpers
# ---------------------------------------------------------------------------

def _atomic_write_json(path: Path, payload: Any) -> None:
    """Write JSON atomically — temp file + os.replace."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
        f.write("\n")
    tmp.replace(path)


# ---------------------------------------------------------------------------
# Personas
# ---------------------------------------------------------------------------

def _agent_to_dict(agent: Agent) -> dict[str, Any]:
    """Serialize an Agent (with nested Source dataclasses) to a plain dict."""
    return asdict(agent)


def _summary(agent: Agent) -> dict[str, Any]:
    """List-view fields per API_SPEC."""
    return {
        "id": agent.id,
        "name": agent.name,
        "title": agent.title,
        "party": agent.party,
        "role": agent.role,
        "specialty": agent.specialty,
        "negotiation_posture": agent.negotiation_posture,
        "persona_last_updated": agent.persona_last_updated,
    }


def load_all_personas() -> list[Agent]:
    """Walk `data/personas/*/*.json` and return every Agent, sorted by id."""
    root = _personas_dir()
    if not root.is_dir():
        return []
    agents: list[Agent] = []
    for party_dir in sorted(root.iterdir()):
        if not party_dir.is_dir():
            continue
        for json_file in sorted(party_dir.glob("*.json")):
            try:
                agents.append(Agent.from_json(json_file))
            except ValueError as e:
                log.warning("skipping malformed persona %s: %s", json_file, e)
    agents.sort(key=lambda a: a.id)
    return agents


def list_personas(
    *,
    party: str | None = None,
    role: str | None = None,
    query: str | None = None,
) -> list[dict[str, Any]]:
    """Return summary records for personas, optionally filtered."""
    agents = load_all_personas()
    if party:
        agents = [a for a in agents if a.party == party]
    if role:
        agents = [a for a in agents if a.role == role]
    if query:
        needle = query.lower()
        agents = [
            a for a in agents
            if needle in (a.name + a.title + a.specialty).lower()
        ]
    return [_summary(a) for a in agents]


def get_persona(persona_id: str) -> dict[str, Any] | None:
    """Full persona record or None if not found."""
    for agent in load_all_personas():
        if agent.id == persona_id:
            return _agent_to_dict(agent)
    return None


def _persona_path(party: str, persona_id: str) -> Path:
    return _personas_dir() / party / f"{persona_id}.json"


def save_persona(persona: dict[str, Any], *, expected_id: str | None = None) -> dict[str, Any]:
    """Validate and write a persona to disk. Returns the saved record.

    Raises ValueError on validation failure (unknown enum, ally/rival rules…).
    """
    agent = Agent(**persona)  # raises ValueError on bad enums/sources
    others = [a for a in load_all_personas() if a.id != agent.id]
    validate_relationships(others + [agent])
    if expected_id is not None and expected_id != agent.id:
        raise ValueError(f"id mismatch: path={expected_id!r} body={agent.id!r}")
    path = _persona_path(agent.party, agent.id)
    _atomic_write_json(path, _agent_to_dict(agent))
    return _agent_to_dict(agent)


def delete_persona(persona_id: str, *, force: bool = False) -> bool:
    """Delete a persona. Returns False if not found.

    Raises ValueError if other personas still reference this id (use force=True
    to strip references and delete anyway).
    """
    target = None
    referenced_by: list[Agent] = []
    for agent in load_all_personas():
        if agent.id == persona_id:
            target = agent
        elif persona_id in agent.allies or persona_id in agent.rivals:
            referenced_by.append(agent)
    if target is None:
        return False
    if referenced_by and not force:
        names = ", ".join(a.id for a in referenced_by)
        raise ValueError(f"persona {persona_id} is referenced by: {names}")
    if force:
        for ref in referenced_by:
            ref.allies = [x for x in ref.allies if x != persona_id]
            ref.rivals = [x for x in ref.rivals if x != persona_id]
            _atomic_write_json(_persona_path(ref.party, ref.id), _agent_to_dict(ref))
    path = _persona_path(target.party, target.id)
    if path.exists():
        path.unlink()
    return True


# ---------------------------------------------------------------------------
# Parties
# ---------------------------------------------------------------------------

def list_parties() -> list[dict[str, Any]]:
    """Return party registry, with seat counts derived from persona files."""
    parties_file = _parties_file()
    if parties_file.exists():
        with parties_file.open("r", encoding="utf-8") as f:
            registry = json.load(f).get("parties", [])
    else:
        registry = list(_DEFAULT_PARTIES)

    personas_root = _personas_dir()
    out: list[dict[str, Any]] = []
    for entry in registry:
        seats = 0
        party_dir = personas_root / entry["id"]
        if party_dir.is_dir():
            seats = sum(1 for _ in party_dir.glob("*.json"))
        out.append({**entry, "seats": seats})
    return out


def save_party(party: dict[str, Any]) -> dict[str, Any]:
    """Add a new party to the registry (or update an existing one)."""
    required = {"id", "label", "color"}
    if not required.issubset(party):
        missing = required - set(party)
        raise ValueError(f"party missing fields: {sorted(missing)}")
    parties_file = _parties_file()
    parties = []
    if parties_file.exists():
        with parties_file.open("r", encoding="utf-8") as f:
            parties = json.load(f).get("parties", [])
    parties = [p for p in parties if p["id"] != party["id"]]
    parties.append({"id": party["id"], "label": party["label"], "color": party["color"]})
    _atomic_write_json(parties_file, {"parties": parties})
    # Make sure the persona dir exists so new personas can be saved there.
    (_personas_dir() / party["id"]).mkdir(parents=True, exist_ok=True)
    return {**party, "seats": 0}


# ---------------------------------------------------------------------------
# Relationships
# ---------------------------------------------------------------------------

def relationships() -> dict[str, list[dict[str, Any]]]:
    """Derive a node/edge graph from current personas (intra-party only)."""
    agents = load_all_personas()
    nodes = [
        {"id": a.id, "name": a.name, "party": a.party, "role": a.role}
        for a in agents
    ]
    edges: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for a in agents:
        for ally in a.allies:
            lo, hi = sorted((a.id, ally))
            key = ("ally", lo, hi)
            if key not in seen:
                edges.append({"from": a.id, "to": ally, "type": "ally"})
                seen.add(key)
        for rival in a.rivals:
            lo, hi = sorted((a.id, rival))
            key = ("rival", lo, hi)
            if key not in seen:
                edges.append({"from": a.id, "to": rival, "type": "rival"})
                seen.add(key)
    return {"nodes": nodes, "edges": edges}
