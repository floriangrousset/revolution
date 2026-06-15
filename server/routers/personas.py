"""Persona endpoints — list, detail, create, update, delete."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response

from .. import db

router = APIRouter(prefix="/api/personas", tags=["personas"])


@router.get("")
def get_personas(
    party: str | None = Query(default=None),
    role: str | None = Query(default=None),
    q: str | None = Query(default=None),
) -> dict[str, list[dict[str, Any]]]:
    return {"personas": db.list_personas(party=party, role=role, query=q)}


@router.get("/{persona_id}")
def get_persona(persona_id: str) -> dict[str, Any]:
    record = db.get_persona(persona_id)
    if record is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": f"persona {persona_id!r} not found"})
    return record


@router.post("", status_code=201)
def create_persona(body: dict[str, Any]) -> dict[str, Any]:
    if "id" not in body:
        raise HTTPException(status_code=422, detail={"code": "missing_field", "message": "id is required"})
    if db.get_persona(body["id"]) is not None:
        raise HTTPException(status_code=409, detail={"code": "conflict", "message": f"persona {body['id']!r} already exists"})
    try:
        return db.save_persona(body)
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"code": "invalid", "message": str(e)}) from e


@router.patch("/{persona_id}")
def update_persona(persona_id: str, body: dict[str, Any]) -> dict[str, Any]:
    current = db.get_persona(persona_id)
    if current is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": f"persona {persona_id!r} not found"})
    merged = {**current, **body, "id": persona_id}
    try:
        return db.save_persona(merged, expected_id=persona_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail={"code": "invalid", "message": str(e)}) from e


@router.delete("/{persona_id}", status_code=204)
def delete_persona(persona_id: str, force: bool = Query(default=False)) -> Response:
    try:
        ok = db.delete_persona(persona_id, force=force)
    except ValueError as e:
        raise HTTPException(status_code=409, detail={"code": "referenced", "message": str(e)}) from e
    if not ok:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": f"persona {persona_id!r} not found"})
    return Response(status_code=204)
