"""Party registry endpoints."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from .. import db

router = APIRouter(prefix="/api/parties", tags=["parties"])


@router.get("")
def list_parties() -> dict[str, list[dict[str, Any]]]:
    return {"parties": db.list_parties()}


@router.post("", status_code=201)
def create_party(body: dict[str, Any]) -> dict[str, Any]:
    try:
        return db.save_party(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"code": "invalid", "message": str(e)}) from e
