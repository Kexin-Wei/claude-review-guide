"""Port of frontend/src/lib/cache.ts — SQLite caching with SHA-256 hashing."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone

import aiosqlite

from app.config import DB_DIR, DB_PATH


def hash_content(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()


async def _ensure_db() -> None:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(DB_PATH)) as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS analysis_cache (
                id TEXT PRIMARY KEY,
                repo_path TEXT NOT NULL,
                diff_hash TEXT NOT NULL,
                scope TEXT NOT NULL,
                result TEXT NOT NULL,
                raw_diff TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS review_state (
                id TEXT PRIMARY KEY,
                analysis_id TEXT NOT NULL REFERENCES analysis_cache(id),
                reviewed_files TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
        """)
        await conn.commit()


async def get_cached_analysis(diff_hash: str) -> dict | None:
    await _ensure_db()
    async with aiosqlite.connect(str(DB_PATH)) as conn:
        conn.row_factory = aiosqlite.Row
        cursor = await conn.execute(
            "SELECT * FROM analysis_cache WHERE diff_hash = ? LIMIT 1",
            (diff_hash,),
        )
        row = await cursor.fetchone()
        if not row:
            return None

        parsed = json.loads(row["result"])
        groups = parsed if isinstance(parsed, list) else parsed.get("groups", [])
        uml_structure = None if isinstance(parsed, list) else parsed.get("umlStructure")
        uml_class_diagram = None if isinstance(parsed, list) else parsed.get("umlClassDiagram")

        return {
            "id": row["id"],
            "groups": groups,
            "rawDiff": row["raw_diff"],
            "createdAt": datetime.fromtimestamp(
                row["created_at"] / 1000, tz=timezone.utc
            ).isoformat(),
            "umlStructure": uml_structure,
            "umlClassDiagram": uml_class_diagram,
        }


async def save_analysis(
    repo_path: str,
    diff_hash: str,
    scope: str,
    groups: list[dict],
    raw_diff: str,
    uml_structure: list[dict] | None = None,
    uml_class_diagram: dict | None = None,
) -> str:
    await _ensure_db()
    analysis_id = str(uuid.uuid4())
    result_obj: dict | list = groups
    if uml_structure or uml_class_diagram:
        result_obj = {"groups": groups}
        if uml_structure:
            result_obj["umlStructure"] = uml_structure
        if uml_class_diagram:
            result_obj["umlClassDiagram"] = uml_class_diagram

    now_ms = int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    async with aiosqlite.connect(str(DB_PATH)) as conn:
        await conn.execute(
            """INSERT INTO analysis_cache (id, repo_path, diff_hash, scope, result, raw_diff, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (analysis_id, repo_path, diff_hash, scope, json.dumps(result_obj), raw_diff, now_ms),
        )
        await conn.commit()
    return analysis_id


async def clear_cache(repo_path: str, scope: str | None = None) -> int:
    await _ensure_db()
    async with aiosqlite.connect(str(DB_PATH)) as conn:
        if scope:
            cursor = await conn.execute(
                "DELETE FROM analysis_cache WHERE repo_path = ? AND scope = ?",
                (repo_path, scope),
            )
        else:
            cursor = await conn.execute(
                "DELETE FROM analysis_cache WHERE repo_path = ?",
                (repo_path,),
            )
        await conn.commit()
        return cursor.rowcount
