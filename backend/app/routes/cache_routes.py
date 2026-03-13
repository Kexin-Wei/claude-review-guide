"""POST /api/cache/clear."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.cache import clear_cache

router = APIRouter(prefix="/api/cache")


class ClearRequest(BaseModel):
    repoPath: str
    scope: str | None = None


@router.post("/clear")
async def clear(body: ClearRequest):
    if not body.repoPath:
        return {"error": "repoPath is required"}, 400
    deleted = await clear_cache(body.repoPath, body.scope)
    return {"deleted": deleted}
