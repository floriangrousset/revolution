"""Relationship graph endpoint — nodes + ally/rival edges derived from personas."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from .. import db

router = APIRouter(prefix="/api/relationships", tags=["relationships"])


@router.get("")
def get_relationships() -> dict[str, list[dict[str, Any]]]:
    return db.relationships()
