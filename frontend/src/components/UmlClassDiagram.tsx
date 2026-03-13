"use client";

import type { UmlClassDiagram as UmlClassDiagramType, UmlClass, UmlRelationship } from "@/types";

interface UmlClassDiagramProps {
  diagram: UmlClassDiagramType;
  onClassClick?: (className: string) => void;
}

const CLASS_TYPE_STYLES: Record<string, { border: string; bg: string; headerBg: string; badge: string }> = {
  class: {
    border: "border-blue-300 dark:border-blue-600",
    bg: "bg-blue-50/50 dark:bg-blue-900/10",
    headerBg: "bg-blue-100 dark:bg-blue-900/30",
    badge: "bg-blue-200 text-blue-800 dark:bg-blue-800/50 dark:text-blue-300",
  },
  interface: {
    border: "border-emerald-300 dark:border-emerald-600",
    bg: "bg-emerald-50/50 dark:bg-emerald-900/10",
    headerBg: "bg-emerald-100 dark:bg-emerald-900/30",
    badge: "bg-emerald-200 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-300",
  },
  abstract: {
    border: "border-violet-300 dark:border-violet-600",
    bg: "bg-violet-50/50 dark:bg-violet-900/10",
    headerBg: "bg-violet-100 dark:bg-violet-900/30",
    badge: "bg-violet-200 text-violet-800 dark:bg-violet-800/50 dark:text-violet-300",
  },
  enum: {
    border: "border-amber-300 dark:border-amber-600",
    bg: "bg-amber-50/50 dark:bg-amber-900/10",
    headerBg: "bg-amber-100 dark:bg-amber-900/30",
    badge: "bg-amber-200 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300",
  },
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  inheritance: "extends",
  implementation: "implements",
  composition: "contains",
  aggregation: "has",
  association: "uses",
  dependency: "depends on",
};

const VISIBILITY_SYMBOLS: Record<string, string> = {
  "+": "+",
  "-": "-",
  "#": "#",
  "~": "~",
};

function getClassStyle(type: string) {
  return CLASS_TYPE_STYLES[type] || CLASS_TYPE_STYLES.class;
}

function ClassBox({ cls, onClick }: { cls: UmlClass; onClick?: () => void }) {
  const style = getClassStyle(cls.type);

  return (
    <button
      onClick={onClick}
      className={`border rounded-lg overflow-hidden text-left hover:shadow-md transition-shadow w-full ${style.border} ${style.bg}`}
    >
      {/* Header */}
      <div className={`px-3 py-2 ${style.headerBg}`}>
        {cls.stereotypes.length > 0 && (
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mb-0.5">
            {cls.stereotypes.map((s) => `\u00AB${s}\u00BB`).join(" ")}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${cls.type === "abstract" ? "italic" : ""} text-zinc-800 dark:text-zinc-200`}>
            {cls.name}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${style.badge}`}>
            {cls.type}
          </span>
        </div>
        {cls.package && (
          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
            {cls.package}
          </div>
        )}
      </div>

      {/* Attributes */}
      {cls.attributes.length > 0 && (
        <div className="px-3 py-1.5 border-t border-zinc-200 dark:border-zinc-700">
          {cls.attributes.map((attr, i) => (
            <div key={i} className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 leading-5">
              <span className="text-zinc-400">{VISIBILITY_SYMBOLS[attr.visibility] || "+"}</span>
              {" "}
              <span className={attr.static ? "underline" : ""}>{attr.name}</span>
              {attr.type && <span className="text-zinc-400">: {attr.type}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Methods */}
      {cls.methods.length > 0 && (
        <div className="px-3 py-1.5 border-t border-zinc-200 dark:border-zinc-700">
          {cls.methods.map((method, i) => (
            <div key={i} className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 leading-5">
              <span className="text-zinc-400">{VISIBILITY_SYMBOLS[method.visibility] || "+"}</span>
              {" "}
              <span className={`${method.static ? "underline" : ""} ${method.abstract ? "italic" : ""}`}>
                {method.name}
              </span>
              <span className="text-zinc-400">({method.parameters})</span>
              {method.returnType && <span className="text-zinc-400">: {method.returnType}</span>}
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

export default function UmlClassDiagram({ diagram, onClassClick }: UmlClassDiagramProps) {
  if (!diagram || !diagram.classes || diagram.classes.length === 0) return null;

  // Group classes by package
  const packages = new Map<string, UmlClass[]>();
  for (const cls of diagram.classes) {
    const pkg = cls.package || "(root)";
    if (!packages.has(pkg)) packages.set(pkg, []);
    packages.get(pkg)!.push(cls);
  }

  // Collect relationships grouped by type
  const relationshipsByType = new Map<string, UmlRelationship[]>();
  for (const rel of diagram.relationships) {
    const type = rel.type;
    if (!relationshipsByType.has(type)) relationshipsByType.set(type, []);
    relationshipsByType.get(type)!.push(rel);
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        {diagram.title || "Class Diagram"}
      </div>

      {/* Class grid grouped by package */}
      {Array.from(packages.entries()).map(([pkg, classes]) => (
        <div key={pkg}>
          {packages.size > 1 && (
            <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 font-mono">
              {pkg}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {classes.map((cls) => (
              <ClassBox
                key={cls.name}
                cls={cls}
                onClick={() => onClassClick?.(cls.name)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Relationships */}
      {diagram.relationships.length > 0 && (
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Relationships
          </div>
          <div className="space-y-2">
            {Array.from(relationshipsByType.entries()).map(([type, rels]) => (
              <div key={type}>
                <div className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 mb-1">
                  {RELATIONSHIP_LABELS[type] || type}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {rels.map((rel, i) => (
                    <span key={i} className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{rel.source}</span>
                      {" \u2192 "}
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{rel.target}</span>
                      {rel.label && <span className="text-zinc-400 ml-1">({rel.label})</span>}
                      {rel.cardinality && <span className="text-zinc-400 ml-1">[{rel.cardinality}]</span>}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-zinc-400 dark:text-zinc-500">
        <span>+ public</span>
        <span>- private</span>
        <span># protected</span>
        <span>~ package</span>
        <span className="underline">static</span>
        <span className="italic">abstract</span>
      </div>
    </div>
  );
}
