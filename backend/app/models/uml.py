from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# Backward-compatible module shape (matches current TypeScript UmlModule)
class UmlModule(CamelModel):
    name: str
    description: str
    type: Literal["layer", "module", "service", "component"]
    files: list[str]
    exports: list[str]
    depends_on: list[str]


# Enhanced UML class diagram types
class UmlAttribute(CamelModel):
    name: str
    type: str = ""
    visibility: Literal["+", "-", "#", "~"] = "+"
    static: bool = False


class UmlMethod(CamelModel):
    name: str
    parameters: str = ""
    return_type: str = ""
    visibility: Literal["+", "-", "#", "~"] = "+"
    static: bool = False
    abstract: bool = False


class UmlRelationship(CamelModel):
    source: str
    target: str
    type: Literal[
        "inheritance", "implementation", "composition",
        "aggregation", "association", "dependency",
    ]
    label: str = ""
    cardinality: str = ""


class UmlClass(CamelModel):
    name: str
    type: Literal["class", "interface", "abstract", "enum"] = "class"
    attributes: list[UmlAttribute] = []
    methods: list[UmlMethod] = []
    stereotypes: list[str] = []
    package: str = ""


class UmlClassDiagram(CamelModel):
    title: str
    classes: list[UmlClass]
    relationships: list[UmlRelationship]


# Combined output from UML analyzer agent
class UmlAnalysisOutput(CamelModel):
    uml_structure: list[UmlModule]
    class_diagram: UmlClassDiagram
