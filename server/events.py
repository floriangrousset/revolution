"""SSE event types and per-debate queues.

Each running debate gets a dedicated `asyncio.Queue`. The debate runner
(`server/engine.run_debate`) enqueues `Event`s; the stream router drains
the queue and serializes them as SSE frames.
"""
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from typing import Any, Literal

EventType = Literal[
    "phase",
    "turn_start",
    "turn_end",
    "vote",
    "vote_change",
    "amendment",
    "result",
    "error",
    "done",
]


@dataclass
class Event:
    type: EventType
    data: dict[str, Any] = field(default_factory=dict)

    def to_sse(self) -> str:
        """Serialize to a Server-Sent-Events frame."""
        payload = json.dumps(self.data, ensure_ascii=False)
        return f"event: {self.type}\ndata: {payload}\n\n"

    @staticmethod
    def phase(phase: str, *, round_: int | None = None) -> "Event":
        data: dict[str, Any] = {"phase": phase}
        if round_ is not None:
            data["round"] = round_
        return Event("phase", data)

    @staticmethod
    def turn_start(*, agent: str, party: str, phase: str) -> "Event":
        return Event("turn_start", {"agent": agent, "party": party, "phase": phase})

    @staticmethod
    def turn_end(payload: dict[str, Any]) -> "Event":
        return Event("turn_end", payload)

    @staticmethod
    def vote(payload: dict[str, Any]) -> "Event":
        return Event("vote", payload)

    @staticmethod
    def vote_change(*, agent: str, from_: str, to: str) -> "Event":
        return Event("vote_change", {"agent": agent, "from": from_, "to": to})

    @staticmethod
    def amendment(payload: dict[str, Any]) -> "Event":
        return Event("amendment", payload)

    @staticmethod
    def result(payload: dict[str, Any]) -> "Event":
        return Event("result", payload)

    @staticmethod
    def error(message: str) -> "Event":
        return Event("error", {"message": message})

    @staticmethod
    def done() -> "Event":
        return Event("done", {})


# Per-debate broadcast queues, keyed by debate id. A debate is added on launch
# and removed once it terminates (passed/rejected/amended/error).
#
# We use a list of queues per debate so multiple SSE clients can attach (e.g.
# the user has two tabs open). Each new client is given a fresh queue that the
# emitter writes to in lockstep with the persisted transcript.
class EventBroadcaster:
    def __init__(self) -> None:
        self._queues: dict[str, list[asyncio.Queue[Event]]] = {}
        self._terminal: dict[str, Event] = {}  # last "done"/"error"/"result" event

    def register(self, debate_id: str) -> asyncio.Queue[Event]:
        queue: asyncio.Queue[Event] = asyncio.Queue()
        self._queues.setdefault(debate_id, []).append(queue)
        return queue

    def unregister(self, debate_id: str, queue: asyncio.Queue[Event]) -> None:
        lst = self._queues.get(debate_id, [])
        if queue in lst:
            lst.remove(queue)
        if not lst and debate_id in self._queues:
            del self._queues[debate_id]

    def publish(self, debate_id: str, event: Event) -> None:
        """Synchronous publish — safe to call from inside a graph node."""
        for q in self._queues.get(debate_id, []):
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                pass

    def mark_done(self, debate_id: str, event: Event) -> None:
        self._terminal[debate_id] = event
        self.publish(debate_id, event)

    def last_terminal(self, debate_id: str) -> Event | None:
        return self._terminal.get(debate_id)

    def has_clients(self, debate_id: str) -> bool:
        return bool(self._queues.get(debate_id))


broadcaster = EventBroadcaster()
