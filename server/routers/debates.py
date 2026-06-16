"""Debate endpoints — launch, list, detail, transcript, votes, amendments."""
from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from .. import engine

router = APIRouter(prefix="/api/debates", tags=["debates"])


@router.get("")
def list_debates() -> dict[str, list[dict[str, Any]]]:
    return {"debates": engine.list_debates()}


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def create_debate(body: dict[str, Any], background_tasks: BackgroundTasks) -> dict[str, Any]:
    proposal = (body.get("proposal") or "").strip()
    if not proposal:
        raise HTTPException(status_code=422, detail={"code": "missing_field", "message": "proposal is required"})
    max_rounds = int(body.get("max_rounds", 2))
    if not 1 <= max_rounds <= 5:
        raise HTTPException(status_code=422, detail={"code": "out_of_range", "message": "max_rounds must be 1..5"})

    record = engine.create_debate_record(
        proposal=proposal,
        title=body.get("title"),
        max_rounds=max_rounds,
        model=body.get("model"),
        temperature=body.get("temperature"),
        parties=body.get("parties"),
    )

    # Kick off the debate as a fire-and-forget asyncio task. This keeps the
    # POST response fast (202 Accepted) so the client can connect to the
    # results endpoint or (in M4) the SSE stream immediately.
    asyncio.create_task(engine.run_debate(record["id"]))

    return {
        "id": record["id"],
        "status": "running",
        "stream": f"/api/debates/{record['id']}/stream",
    }


@router.get("/{debate_id}")
def get_debate(debate_id: str) -> dict[str, Any]:
    record = engine.get_debate(debate_id)
    if record is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": f"debate {debate_id!r} not found"})
    return record


@router.get("/{debate_id}/transcript")
def get_transcript(debate_id: str) -> dict[str, list[dict[str, Any]]]:
    return {"turns": engine.read_transcript(debate_id)}


@router.get("/{debate_id}/votes")
def get_votes(debate_id: str) -> dict[str, list[dict[str, Any]]]:
    return {"votes": engine.read_votes(debate_id)}


@router.get("/{debate_id}/amendments")
def get_amendments(debate_id: str) -> dict[str, list[dict[str, Any]]]:
    return {"amendments": engine.read_amendments(debate_id)}
