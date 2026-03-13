"""GET /api/repo/validate and GET /api/repo/commits."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, Query

from app.services.git import get_recent_commits, validate_repo

router = APIRouter(prefix="/api/repo")


@router.get("/validate")
async def validate(path: str = Query(..., alias="path")):
    if not os.path.isabs(path) or not Path(path).exists():
        return {"valid": False, "branch": ""}
    return await validate_repo(path)


@router.get("/commits")
async def commits(path: str = Query(...), count: int = Query(10)):
    if not path:
        return {"error": "path parameter required"}, 400
    try:
        result = await get_recent_commits(path, count)
        return {"commits": result}
    except Exception as e:
        return {"error": "Failed to get commits", "details": str(e)}
