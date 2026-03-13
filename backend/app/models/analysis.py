from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CodeBlock(CamelModel):
    name: str
    type: Literal[
        "function", "class", "hook", "component", "method",
        "constant", "type", "interface", "module",
    ]
    line_start: int
    line_end: int
    description: str


class FileAnnotations(CamelModel):
    what_changed: str
    why_it_matters: str
    review_hint: str


class FileChange(CamelModel):
    path: str
    line_range: str | None = None
    description: str
    diff: str = ""
    blocks: list[CodeBlock] | None = None
    annotations: FileAnnotations


class FeatureGroup(CamelModel):
    id: str = ""
    title: str
    summary: str
    category: str
    significance: int
    files: list[FileChange]


class AnalyzeRequest(CamelModel):
    repo_path: str
    scope: Literal["all", "staged", "unstaged", "branch", "commit", "range"]
    commit_ref: str | None = None
    from_ref: str | None = None
    to_ref: str | None = None


class RepoAnalysisRequest(CamelModel):
    repo_path: str
    repo_scope: Literal["all", "committed"] = "committed"


class AnalysisResult(CamelModel):
    id: str
    groups: list[FeatureGroup]
    raw_diff: str
    analyzed_at: str
    cached: bool
    type: Literal["diff", "repo"]
    file_tree: list[str] | None = None
    uml_structure: list | None = None
    uml_class_diagram: dict | None = None
    message: str | None = None


# Schema for Claude structured output (no id field — assigned after)
class FeatureGroupOutput(CamelModel):
    title: str
    summary: str
    category: str
    significance: int
    files: list[FileChange]


class DiffAnalysisOutput(CamelModel):
    groups: list[FeatureGroupOutput]


class RepoAnalysisOutput(CamelModel):
    groups: list[FeatureGroupOutput]
