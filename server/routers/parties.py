"""Party registry endpoints."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response

from .. import db

router = APIRouter(prefix="/api/parties", tags=["parties"])


@router.get("")
def list_parties() -> dict[str, list[dict[str, Any]]]:
    return {"parties": db.list_parties()}


@router.get("/{party_id}")
def get_party(party_id: str) -> dict[str, Any]:
    record = db.get_party(party_id)
    if record is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": f"party {party_id!r} not found"})
    return record


@router.post("", status_code=201)
def create_party(body: dict[str, Any]) -> dict[str, Any]:
    try:
        return db.save_party(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"code": "invalid", "message": str(e)}) from e


@router.patch("/{party_id}")
def update_party(party_id: str, body: dict[str, Any]) -> dict[str, Any]:
    try:
        return db.update_party(party_id, body)
    except KeyError as e:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": f"party {party_id!r} not found"}) from e
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"code": "invalid", "message": str(e)}) from e


@router.delete("/{party_id}", status_code=204)
def delete_party(party_id: str, force: bool = Query(default=False)) -> Response:
    try:
        ok = db.delete_party(party_id, force=force)
    except ValueError as e:
        raise HTTPException(status_code=409, detail={"code": "blocked", "message": str(e)}) from e
    if not ok:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": f"party {party_id!r} not found"})
    return Response(status_code=204)
