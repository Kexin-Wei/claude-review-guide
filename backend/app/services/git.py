"""Port of frontend/src/lib/git.ts — git subprocess helpers."""

from __future__ import annotations

import asyncio
import re

COMMIT_REF_PATTERN = re.compile(r"^[a-zA-Z0-9._/~^-]+$")
MAX_BUFFER = 50 * 1024 * 1024  # 50 MB


def _validate_ref(ref: str) -> str:
    if not COMMIT_REF_PATTERN.match(ref):
        raise ValueError(f"Invalid git ref: {ref}")
    return ref


async def _git(args: list[str], cwd: str) -> str:
    proc = await asyncio.create_subprocess_exec(
        "git", *args,
        cwd=cwd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {stderr.decode()[:500]}")
    return stdout.decode()


async def validate_repo(repo_path: str) -> dict:
    try:
        await _git(["rev-parse", "--is-inside-work-tree"], repo_path)
        branch = (await _git(["rev-parse", "--abbrev-ref", "HEAD"], repo_path)).strip()
        remote_url: str | None = None
        try:
            remote_url = (await _git(["remote", "get-url", "origin"], repo_path)).strip()
        except RuntimeError:
            pass
        return {"valid": True, "branch": branch, "remoteUrl": remote_url}
    except (RuntimeError, FileNotFoundError):
        return {"valid": False, "branch": ""}


async def get_recent_commits(repo_path: str, count: int = 10) -> list[dict]:
    log = await _git(
        ["log", "--oneline", f"-{count}", "--format=%H|%s|%an|%aI"],
        repo_path,
    )
    commits = []
    for line in log.strip().split("\n"):
        if not line:
            continue
        parts = line.split("|", 3)
        if len(parts) == 4:
            commits.append({
                "hash": parts[0],
                "message": parts[1],
                "author": parts[2],
                "date": parts[3],
            })
    return commits


async def _detect_main_branch(repo_path: str) -> str:
    try:
        await _git(["rev-parse", "--verify", "main"], repo_path)
        return "main"
    except RuntimeError:
        try:
            await _git(["rev-parse", "--verify", "master"], repo_path)
            return "master"
        except RuntimeError:
            return "main"


async def get_diff(
    repo_path: str,
    scope: str,
    commit_ref: str | None = None,
    from_ref: str | None = None,
    to_ref: str | None = None,
) -> str:
    match scope:
        case "all":
            return await _git(["diff", "HEAD"], repo_path)
        case "staged":
            return await _git(["diff", "--cached"], repo_path)
        case "unstaged":
            return await _git(["diff"], repo_path)
        case "branch":
            main_branch = await _detect_main_branch(repo_path)
            merge_base = (await _git(["merge-base", "HEAD", main_branch], repo_path)).strip()
            return await _git(["diff", f"{merge_base}..HEAD"], repo_path)
        case "commit":
            if not commit_ref:
                raise ValueError("commitRef required for commit scope")
            return await _git(["show", _validate_ref(commit_ref), "--format="], repo_path)
        case "range":
            if not from_ref or not to_ref:
                raise ValueError("fromRef and toRef required for range scope")
            return await _git(
                ["diff", f"{_validate_ref(from_ref)}..{_validate_ref(to_ref)}"],
                repo_path,
            )
        case _:
            raise ValueError(f"Unknown scope: {scope}")
