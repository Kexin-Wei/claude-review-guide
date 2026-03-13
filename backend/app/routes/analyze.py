"""POST /api/analyze — diff analysis endpoint."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.analysis import AnalyzeRequest
from app.services.cache import get_cached_analysis, hash_content, save_analysis
from app.services.git import get_diff, validate_repo
from app.agents.orchestrator import analyze_diff

router = APIRouter()


@router.post("/api/analyze")
async def analyze(body: AnalyzeRequest):
    repo_path = body.repo_path
    scope = body.scope

    if not repo_path or not scope:
        return JSONResponse(
            {"error": "repoPath and scope are required"}, status_code=400
        )

    repo = await validate_repo(repo_path)
    if not repo["valid"]:
        return JSONResponse({"error": "Invalid git repository"}, status_code=400)

    try:
        diff = await get_diff(repo_path, scope, body.commit_ref, body.from_ref, body.to_ref)

        if not diff.strip():
            return {
                "id": "",
                "groups": [],
                "rawDiff": "",
                "analyzedAt": datetime.now(tz=timezone.utc).isoformat(),
                "cached": False,
                "type": "diff",
                "message": "No changes found",
            }

        diff_hash = hash_content(diff)
        cached = await get_cached_analysis(diff_hash)

        if cached:
            return {
                "id": cached["id"],
                "groups": cached["groups"],
                "rawDiff": cached["rawDiff"],
                "analyzedAt": cached["createdAt"],
                "cached": True,
                "type": "diff",
            }

        groups = await analyze_diff(diff, repo_path)
        analysis_id = await save_analysis(repo_path, diff_hash, scope, groups, diff)

        return {
            "id": analysis_id,
            "groups": groups,
            "rawDiff": diff,
            "analyzedAt": datetime.now(tz=timezone.utc).isoformat(),
            "cached": False,
            "type": "diff",
        }
    except Exception as e:
        return JSONResponse(
            {"error": "Analysis failed", "details": str(e)},
            status_code=500,
        )
