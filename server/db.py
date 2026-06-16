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

# Default seed parties (both the two ground-truth caucuses the engine knows
# about and any common custom parties the user has spun up). Metadata is
# retro-filled on startup if a party row is missing fields.
_DEFAULT_PARTIES: list[dict[str, Any]] = [
    {
        "id": "democrat",
        "label": "Democratic Caucus",
        "color": "#2E5AA8",
        "ideology": "Modern American liberalism",
        "founded_year": 1828,
        "motto": "Working for a stronger middle class",
        "description": (
            "The Democratic Party is one of the two major contemporary U.S. political "
            "parties. Its modern coalition centers on social-safety-net expansion, civil "
            "rights, labor protections, climate action, and a regulated mixed economy."
        ),
        "created_at": "2026-06-15T00:00:00+00:00",
    },
    {
        "id": "republican",
        "label": "Republican Conference",
        "color": "#C0392B",
        "ideology": "Modern American conservatism",
        "founded_year": 1854,
        "motto": "Limited government, individual liberty, strong defense",
        "description": (
            "The Republican Party is one of the two major contemporary U.S. political "
            "parties. Its modern coalition centers on constitutional originalism, "
            "lower taxation, free-enterprise economics, religious-liberty protections, "
            "and a strong national defense."
        ),
        "created_at": "2026-06-15T00:00:00+00:00",
    },
]

# Default metadata for parties seeded after the fact (e.g. created via the UI
# before the schema gained these fields). Anything missing is filled in.
_PARTY_FALLBACK_META: dict[str, dict[str, Any]] = {
    "libertarian": {
        "label": "Libertarian Caucus",
        "color": "#C2A14D",
        "ideology": "Classical liberalism / civil-libertarian populism",
        "founded_year": 1971,
        "motto": "Maximum freedom, minimum government",
        "description": (
            "The Libertarian Party advocates for free markets, civil liberties, "
            "non-interventionism, and a sharply limited federal government. It is the "
            "largest U.S. third party by registered membership."
        ),
    },
    "green": {
        "label": "Green Caucus",
        "color": "#2E8B57",
        "ideology": "Green politics / eco-socialism",
        "founded_year": 2001,
        "motto": "Ecology, social justice, grassroots democracy, peace",
        "description": (
            "The Green Party of the United States organizes around four pillars: "
            "ecological wisdom, social justice, grassroots democracy, and "
            "non-violence. Its policy agenda emphasizes climate action, economic "
            "redistribution, and demilitarization."
        ),
    },
}

# Required party fields and the per-field defaults applied when a row is read
# from disk and missing them.
_PARTY_FIELD_DEFAULTS: dict[str, Any] = {
    "ideology": "",
    "founded_year": None,
    "motto": "",
    "description": "",
    "color": "#C2A14D",
    "created_at": None,
}

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
    else:
        _backfill_party_metadata()

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


def _backfill_party_metadata() -> None:
    """Bring an older parties.json up to the current schema in place.

    For each registered party:
      1. Apply hand-written metadata if we ship a fallback for that id
         (libertarian, green).
      2. Otherwise, fill missing scalar fields with `_PARTY_FIELD_DEFAULTS`.
    The file is only rewritten if any field actually changed.
    """
    parties_file = _parties_file()
    if not parties_file.exists():
        return
    with parties_file.open("r", encoding="utf-8") as f:
        data = json.load(f)
    entries = data.get("parties", [])
    by_id = {e["id"]: e for e in _DEFAULT_PARTIES}
    changed = False
    for entry in entries:
        before = dict(entry)
        pid = entry["id"]
        # Apply hand-written defaults when we ship one.
        canonical = by_id.get(pid) or _PARTY_FALLBACK_META.get(pid)
        if canonical:
            for k, v in canonical.items():
                if not entry.get(k):
                    entry[k] = v
        # Then ensure every required scalar exists.
        for k, default in _PARTY_FIELD_DEFAULTS.items():
            if k not in entry:
                entry[k] = default
        if entry.get("created_at") is None:
            from datetime import datetime, timezone
            entry["created_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        if entry != before:
            changed = True
    if changed:
        _atomic_write_json(parties_file, {"parties": entries})
        log.info("backfilled parties.json metadata")


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
    If the persona's `party` changed since the last save, the previous on-disk
    file is removed so we don't leave an orphan in the old party's directory.
    """
    agent = Agent(**persona)  # raises ValueError on bad enums/sources

    # Detect a party change against the current on-disk file. The lookup walks
    # all party directories rather than trusting the caller's payload, which
    # may already be the new party.
    previous_path: Path | None = None
    for existing in load_all_personas():
        if existing.id == agent.id and existing.party != agent.party:
            previous_path = _persona_path(existing.party, existing.id)
            break

    others = [a for a in load_all_personas() if a.id != agent.id]
    validate_relationships(others + [agent])
    if expected_id is not None and expected_id != agent.id:
        raise ValueError(f"id mismatch: path={expected_id!r} body={agent.id!r}")
    path = _persona_path(agent.party, agent.id)
    _atomic_write_json(path, _agent_to_dict(agent))

    if previous_path is not None and previous_path.exists() and previous_path != path:
        try:
            previous_path.unlink()
        except OSError as e:
            log.warning("orphaned persona file %s left behind: %s", previous_path, e)
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

def _read_parties_file() -> list[dict[str, Any]]:
    parties_file = _parties_file()
    if parties_file.exists():
        with parties_file.open("r", encoding="utf-8") as f:
            return json.load(f).get("parties", [])
    return list(_DEFAULT_PARTIES)


def list_parties() -> list[dict[str, Any]]:
    """Return party registry, with seat counts derived from persona files."""
    registry = _read_parties_file()
    personas_root = _personas_dir()
    out: list[dict[str, Any]] = []
    for entry in registry:
        seats = 0
        party_dir = personas_root / entry["id"]
        if party_dir.is_dir():
            seats = sum(1 for _ in party_dir.glob("*.json"))
        out.append({**entry, "seats": seats})
    return out


def get_party(party_id: str) -> dict[str, Any] | None:
    """Single party record with derived seat count, or None."""
    for entry in list_parties():
        if entry["id"] == party_id:
            return entry
    return None


def save_party(party: dict[str, Any]) -> dict[str, Any]:
    """Add or replace a party in the registry. Fills in defaults for missing
    metadata fields and stamps `created_at` if unset."""
    required = {"id", "label", "color"}
    if not required.issubset(party):
        missing = required - set(party)
        raise ValueError(f"party missing fields: {sorted(missing)}")
    pid = party["id"].strip()
    if not pid:
        raise ValueError("party id cannot be empty")
    if not pid.replace("_", "").isalnum():
        raise ValueError(
            f"party id {pid!r} must be alphanumeric with underscores only"
        )
    parties = _read_parties_file()
    existing = next((p for p in parties if p["id"] == pid), None)
    payload: dict[str, Any] = dict(existing or {})
    for k, default in _PARTY_FIELD_DEFAULTS.items():
        payload.setdefault(k, default)
    payload.update({k: v for k, v in party.items() if v is not None})
    payload["id"] = pid
    if not payload.get("created_at"):
        from datetime import datetime, timezone
        payload["created_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    parties = [p for p in parties if p["id"] != pid]
    parties.append(payload)
    _atomic_write_json(_parties_file(), {"parties": parties})
    # Make sure the persona dir exists so new personas can be saved there.
    (_personas_dir() / pid).mkdir(parents=True, exist_ok=True)
    seats = sum(1 for _ in (_personas_dir() / pid).glob("*.json"))
    return {**payload, "seats": seats}


def update_party(party_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    """Partial update — merge new fields into the existing record."""
    parties = _read_parties_file()
    target = next((p for p in parties if p["id"] == party_id), None)
    if target is None:
        raise KeyError(party_id)
    # 'id' is immutable.
    patch = {k: v for k, v in patch.items() if k != "id"}
    merged = {**target, **patch}
    return save_party(merged)


def delete_party(party_id: str, *, force: bool = False) -> bool:
    """Remove a party. Rejects if any persona is still seated there unless
    `force=True` (which also deletes the personas). Returns False if not
    found. The two ground-truth parties cannot be deleted."""
    if party_id in {"democrat", "republican"}:
        raise ValueError(
            f"the {party_id!r} caucus is part of the seeded chamber and cannot be removed"
        )
    parties = _read_parties_file()
    target = next((p for p in parties if p["id"] == party_id), None)
    if target is None:
        return False
    party_dir = _personas_dir() / party_id
    seated = sorted(party_dir.glob("*.json")) if party_dir.is_dir() else []
    if seated and not force:
        ids = ", ".join(p.stem for p in seated)
        raise ValueError(
            f"party {party_id!r} still has seated personas: {ids}"
        )
    if force:
        # Cascade-delete personas in the party. Other-party references to
        # them get stripped too.
        for f in seated:
            try:
                pid = f.stem
            except Exception:
                continue
            try:
                delete_persona(pid, force=True)
            except Exception as e:
                log.warning("failed to delete persona %s during party cascade: %s", pid, e)
    if party_dir.is_dir() and not any(party_dir.iterdir()):
        try:
            party_dir.rmdir()
        except OSError:
            pass
    parties = [p for p in parties if p["id"] != party_id]
    _atomic_write_json(_parties_file(), {"parties": parties})
    return True


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
