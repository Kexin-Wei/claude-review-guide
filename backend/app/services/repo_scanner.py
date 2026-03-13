"""Port of frontend/src/lib/repo-scanner.ts — repository file scanning."""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass, field
from pathlib import Path

KEY_FILES = [
    "package.json", "tsconfig.json",
    "next.config.js", "next.config.ts", "next.config.mjs",
    "vite.config.ts", "vite.config.js",
    "Dockerfile", "docker-compose.yml",
    "Cargo.toml", "go.mod",
    "pyproject.toml", "requirements.txt", "Makefile",
]

SOURCE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".rb"}

IGNORE_DIRS = {"node_modules", ".git", "dist", "build", ".next", "__pycache__", "vendor"}

ENTRY_PATTERNS = [
    re.compile(r"index\.[tj]sx?$"),
    re.compile(r"main\.[tj]sx?$"),
    re.compile(r"app\.[tj]sx?$"),
    re.compile(r"page\.[tj]sx?$"),
    re.compile(r"layout\.[tj]sx?$"),
    re.compile(r"route\.[tj]sx?$"),
    re.compile(r"server\.[tj]sx?$"),
    re.compile(r"mod\.rs$"),
    re.compile(r"lib\.rs$"),
    re.compile(r"main\.go$"),
]


@dataclass
class RepoSnapshot:
    file_tree: list[str] = field(default_factory=list)
    key_files: list[dict[str, str]] = field(default_factory=list)
    source_files: list[dict[str, str]] = field(default_factory=list)
    stats: dict = field(default_factory=dict)


def _is_ignored(filepath: str) -> bool:
    parts = filepath.split("/")
    return any(d in IGNORE_DIRS for d in parts)


def _has_source_ext(filepath: str) -> bool:
    return Path(filepath).suffix in SOURCE_EXTENSIONS


def _is_entry(filepath: str) -> bool:
    return any(p.search(filepath) for p in ENTRY_PATTERNS)


async def _read_file(repo_path: str, rel_path: str, max_chars: int = 3000) -> str | None:
    try:
        full = Path(repo_path) / rel_path
        content = await asyncio.to_thread(full.read_text, encoding="utf-8")
        return content[:max_chars]
    except Exception:
        return None


async def scan_repo(repo_path: str, include_uncommitted: bool = False) -> RepoSnapshot:
    proc = await asyncio.create_subprocess_exec(
        "git", "ls-files",
        cwd=repo_path,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await proc.communicate()
    tracked = [f for f in stdout.decode().strip().split("\n") if f]
    all_files = list(tracked)

    if include_uncommitted:
        try:
            proc2 = await asyncio.create_subprocess_exec(
                "git", "ls-files", "--others", "--exclude-standard",
                cwd=repo_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            out2, _ = await proc2.communicate()
            untracked = [f for f in out2.decode().strip().split("\n") if f]
            all_files.extend(untracked)
        except Exception:
            pass

    # File type stats
    file_types: dict[str, int] = {}
    for f in all_files:
        ext = Path(f).suffix or "(no ext)"
        file_types[ext] = file_types.get(ext, 0) + 1

    # Read key config files
    key_files: list[dict[str, str]] = []
    for key_file in KEY_FILES:
        match = next(
            (f for f in all_files if f == key_file or f.endswith(f"/{key_file}")),
            None,
        )
        if match:
            content = await _read_file(repo_path, match, max_chars=5000)
            if content is not None:
                key_files.append({"path": match, "content": content})

    # Sample source files — prioritize entry points
    source_candidates = [f for f in all_files if _has_source_ext(f) and not _is_ignored(f)]
    entry_files = [f for f in source_candidates if _is_entry(f)]
    other_files = [f for f in source_candidates if not _is_entry(f)]
    to_read = entry_files[:20] + other_files[:10]

    source_files: list[dict[str, str]] = []
    for f in to_read:
        content = await _read_file(repo_path, f, max_chars=3000)
        if content is not None:
            source_files.append({"path": f, "content": content})

    return RepoSnapshot(
        file_tree=all_files,
        key_files=key_files,
        source_files=source_files,
        stats={"totalFiles": len(all_files), "fileTypes": file_types},
    )
