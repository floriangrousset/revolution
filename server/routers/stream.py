"""Server-Sent Events endpoint for live debate streaming.

On connect, replays the persisted transcript (so the client always starts from
turn 1 regardless of join time), then forwards live events from the per-debate
queue until the engine emits `done`.
"""
from __future__ import annotations

import asyncio
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from .. import engine
from ..events import Event, broadcaster

router = APIRouter(prefix="/api/debates", tags=["stream"])


@router.get("/{debate_id}/stream")
async def stream(debate_id: str) -> StreamingResponse:
    record = engine.get_debate(debate_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": f"debate {debate_id!r} not found"},
        )

    async def generator() -> AsyncGenerator[str, None]:
        # 1) Replay the persisted transcript.
        for line in engine.read_transcript(debate_id):
            yield Event.turn_end(line).to_sse()

        # 2) Replay persisted votes (so a late join sees the ledger).
        for v in engine.read_votes(debate_id):
            yield Event.vote(v).to_sse()

        # 3) If the debate already terminated, emit the last terminal event
        # and close. We tolerate `result` and `error` records.
        if record.get("status") in {"passed", "rejected", "amended"}:
            yield Event.result(
                {"result": record["status"], "tally": record["tally"]}
            ).to_sse()
            yield Event.done().to_sse()
            return
        if record.get("status") == "error":
            yield Event.error(record.get("error", "Debate failed.")).to_sse()
            yield Event.done().to_sse()
            return

        # 4) Live tail: attach to the broadcaster queue and forward events
        # until we see `done`. A 30s heartbeat keeps the connection open
        # through proxies that idle-close.
        queue = broadcaster.register(debate_id)
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"  # SSE comment, ignored by client
                    continue
                yield event.to_sse()
                if event.type == "done":
                    return
        finally:
            broadcaster.unregister(debate_id, queue)

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
