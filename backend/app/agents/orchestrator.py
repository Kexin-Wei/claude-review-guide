"""Orchestrator — dispatches to sub-agents and handles parallel execution."""

from __future__ import annotations

import asyncio
import logging
import re
import uuid

from claude_agent_sdk import ClaudeAgentOptions, ResultMessage, query
from pathlib import Path

from app.agents.code_analyzer import code_analyzer_agent, repo_analyzer_agent
from app.agents.uml_analyzer import uml_analyzer_agent
from app.models.analysis import DiffAnalysisOutput, FeatureGroupOutput, RepoAnalysisOutput
from app.models.uml import UmlAnalysisOutput
from app.services.repo_scanner import RepoSnapshot

logger = logging.getLogger(__name__)

MAX_DIFF_SIZE = 100_000
MAX_PROMPT_SIZE = 150_000


def _extract_file_diff(full_diff: str, file_path: str) -> str:
    escaped = re.escape(file_path)
    pattern = re.compile(rf"diff --git a/.*?{escaped} b/.*?{escaped}", re.MULTILINE)
    match = pattern.search(full_diff)
    if not match:
        return ""
    start = match.start()
    next_diff = full_diff.find("\ndiff --git ", start + 1)
    return full_diff[start:] if next_diff == -1 else full_diff[start:next_diff]


async def analyze_diff(diff: str, repo_path: str) -> list[dict]:
    truncated = len(diff) > MAX_DIFF_SIZE
    processed_diff = diff[:MAX_DIFF_SIZE] if truncated else diff

    note = f" NOTE: Truncated at {MAX_DIFF_SIZE} chars." if truncated else ""
    user_message = (
        f"Analyze this git diff.{note}\n\n"
        f"<diff>\n{processed_diff}\n</diff>\n\n"
        "Respond with ONLY the JSON object."
    )

    structured_output = await _run_agent(
        prompt=user_message,
        agents={"code-analyzer": code_analyzer_agent},
        schema=DiffAnalysisOutput.model_json_schema(),
        cwd=repo_path,
        agent_name="code-analyzer",
    )

    groups = []
    if structured_output and "groups" in structured_output:
        for group in structured_output["groups"]:
            group["id"] = str(uuid.uuid4())
            for file in group.get("files", []):
                file["diff"] = _extract_file_diff(diff, file.get("path", ""))
            groups.append(group)

    return groups


async def analyze_repo(
    snapshot: RepoSnapshot,
    repo_path: str,
) -> tuple[list[dict], list[dict] | None, dict | None]:
    """Returns (groups, uml_structure, uml_class_diagram)."""

    file_tree_section = "\n".join(snapshot.file_tree)
    key_files_section = "\n\n".join(
        f"--- {f['path']} ---\n{f['content']}" for f in snapshot.key_files
    )
    source_files_section = "\n\n".join(
        f"--- {f['path']} ---\n{f['content']}" for f in snapshot.source_files
    )
    stats_section = (
        f"Total files: {snapshot.stats['totalFiles']}\n"
        f"File types: {', '.join(f'{ext}: {count}' for ext, count in sorted(snapshot.stats['fileTypes'].items(), key=lambda x: -x[1]))}"
    )

    code_prompt = (
        f"Analyze this repository architecture.\n\n"
        f"<stats>\n{stats_section}\n</stats>\n\n"
        f"<file-tree>\n{file_tree_section}\n</file-tree>\n\n"
        f"<config-files>\n{key_files_section}\n</config-files>\n\n"
        f"<source-samples>\n{source_files_section}\n</source-samples>\n\n"
        "Respond with ONLY the JSON object."
    )
    if len(code_prompt) > MAX_PROMPT_SIZE:
        code_prompt = code_prompt[:MAX_PROMPT_SIZE] + "\n\n[TRUNCATED]\n\nRespond with ONLY the JSON object."

    uml_prompt = (
        f"Generate UML diagrams for this repository.\n\n"
        f"<stats>\n{stats_section}\n</stats>\n\n"
        f"<file-tree>\n{file_tree_section}\n</file-tree>\n\n"
        f"<source-samples>\n{source_files_section}\n</source-samples>\n\n"
        "Use Read/Grep/Glob tools to explore files beyond these samples for class details.\n\n"
        "Respond with ONLY the JSON object."
    )
    if len(uml_prompt) > MAX_PROMPT_SIZE:
        uml_prompt = uml_prompt[:MAX_PROMPT_SIZE] + "\n\n[TRUNCATED]\n\nRespond with ONLY the JSON object."

    # Run code and UML analysis in parallel
    code_result, uml_result = await asyncio.gather(
        _run_agent(
            prompt=code_prompt,
            agents={"repo-analyzer": repo_analyzer_agent},
            schema=RepoAnalysisOutput.model_json_schema(),
            cwd=repo_path,
            agent_name="repo-analyzer",
        ),
        _run_agent(
            prompt=uml_prompt,
            agents={"uml-analyzer": uml_analyzer_agent},
            schema=UmlAnalysisOutput.model_json_schema(),
            cwd=repo_path,
            agent_name="uml-analyzer",
        ),
        return_exceptions=True,
    )

    # Process code analysis result
    groups = []
    if isinstance(code_result, dict) and "groups" in code_result:
        for group in code_result["groups"]:
            group["id"] = str(uuid.uuid4())
            for file in group.get("files", []):
                file.setdefault("diff", "")
            groups.append(group)
    elif isinstance(code_result, Exception):
        logger.error("Code analysis agent failed: %s", code_result)

    # Process UML result
    uml_structure = None
    uml_class_diagram = None
    if isinstance(uml_result, dict):
        uml_structure = uml_result.get("umlStructure") or uml_result.get("uml_structure")
        class_diag = uml_result.get("classDiagram") or uml_result.get("class_diagram")
        if class_diag:
            uml_class_diagram = class_diag
    elif isinstance(uml_result, Exception):
        logger.error("UML analysis agent failed: %s", uml_result)

    return groups, uml_structure, uml_class_diagram


async def _run_agent(
    prompt: str,
    agents: dict,
    schema: dict,
    cwd: str,
    agent_name: str,
) -> dict | None:
    """Run a Claude agent and return its structured output."""
    options = ClaudeAgentOptions(
        allowed_tools=["Read", "Grep", "Glob", "Task"],
        agents=agents,
        output_format={"type": "json_schema", "schema": schema},
        cwd=Path(cwd),
        max_turns=30,
        model="claude-sonnet-4-5",
    )

    result = None
    async for message in query(
        prompt=f"Use the {agent_name} agent to complete this task:\n\n{prompt}",
        options=options,
    ):
        if isinstance(message, ResultMessage) and message.structured_output:
            result = message.structured_output

    return result
