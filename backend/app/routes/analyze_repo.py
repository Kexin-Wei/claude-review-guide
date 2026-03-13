"""POST /api/analyze-repo — repository analysis endpoint."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.models.analysis import RepoAnalysisRequest
from app.services.cache import get_cached_analysis, hash_content, save_analysis
from app.services.git import validate_repo
from app.services.repo_scanner import scan_repo
from app.agents.orchestrator import analyze_repo

router = APIRouter()

MAX_FILE_SIZE = 50_000


async def _read_file_content(repo_path: str, rel_path: str) -> str:
    try:
        full = Path(repo_path) / rel_path
        content = await asyncio.to_thread(full.read_text, encoding="utf-8")
        if len(content) > MAX_FILE_SIZE:
            return content[:MAX_FILE_SIZE] + "\n// ... truncated"
        return content
    except Exception:
        return ""


async def _attach_file_contents(groups: list[dict], repo_path: str) -> list[dict]:
    result = []
    for group in groups:
        if group.get("category", "").lower().find("architecture") != -1:
            result.append(group)
            continue
        new_files = []
        for file in group.get("files", []):
            content = await _read_file_content(repo_path, file.get("path", ""))
            new_files.append({**file, "diff": content})
        result.append({**group, "files": new_files})
    return result


async def _get_dirty_state(repo_path: str) -> str:
    try:
        proc = await asyncio.create_subprocess_exec(
            "git", "status", "--porcelain",
            cwd=repo_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await proc.communicate()
        return stdout.decode()
    except Exception:
        return ""


@router.post("/api/analyze-repo")
async def analyze_repo_endpoint(body: RepoAnalysisRequest):
    repo_path = body.repo_path

    if not repo_path:
        return JSONResponse({"error": "repoPath is required"}, status_code=400)

    repo = await validate_repo(repo_path)
    if not repo["valid"]:
        return JSONResponse({"error": "Invalid git repository"}, status_code=400)

    try:
        include_uncommitted = body.repo_scope == "all"
        snapshot = await scan_repo(repo_path, include_uncommitted)

        dirty_state = await _get_dirty_state(repo_path) if include_uncommitted else ""
        cache_key = hash_content(
            "\n".join(snapshot.file_tree) + "\n---\n" + body.repo_scope + "\n" + dirty_state
        )
        cached = await get_cached_analysis(cache_key)

        if cached:
            groups_with_content = await _attach_file_contents(cached["groups"], repo_path)
            return {
                "id": cached["id"],
                "groups": groups_with_content,
                "rawDiff": cached["rawDiff"],
                "analyzedAt": cached["createdAt"],
                "cached": True,
                "type": "repo",
                "fileTree": snapshot.file_tree,
                "umlStructure": cached.get("umlStructure"),
                "umlClassDiagram": cached.get("umlClassDiagram"),
            }

        groups, uml_structure, uml_class_diagram = await analyze_repo(snapshot, repo_path)
        groups_with_content = await _attach_file_contents(groups, repo_path)

        analysis_id = await save_analysis(
            repo_path, cache_key, "repo-analysis",
            groups, "",
            uml_structure=uml_structure,
            uml_class_diagram=uml_class_diagram,
        )

        return {
            "id": analysis_id,
            "groups": groups_with_content,
            "rawDiff": "",
            "analyzedAt": datetime.now(tz=timezone.utc).isoformat(),
            "cached": False,
            "type": "repo",
            "fileTree": snapshot.file_tree,
            "umlStructure": uml_structure,
            "umlClassDiagram": uml_class_diagram,
        }
    except Exception as e:
        return JSONResponse(
            {"error": "Repo analysis failed", "details": str(e)},
            status_code=500,
        )
