"use client";

import type { UmlModule } from "@/types";

interface UmlDiagramProps {
  modules: UmlModule[];
  onModuleClick?: (moduleName: string) => void;
}

const MODULE_TYPE_STYLES: Record<string, { border: string; bg: string; badge: string; headerBg: string }> = {
  layer: {
    border: "border-indigo-300 dark:border-indigo-600",
    bg: "bg-indigo-50/50 dark:bg-indigo-900/10",
    headerBg: "bg-indigo-100 dark:bg-indigo-900/30",
    badge: "bg-indigo-200 text-indigo-800 dark:bg-indigo-800/50 dark:text-indigo-300",
  },
  module: {
    border: "border-teal-300 dark:border-teal-600",
    bg: "bg-teal-50/50 dark:bg-teal-900/10",
    headerBg: "bg-teal-100 dark:bg-teal-900/30",
    badge: "bg-teal-200 text-teal-800 dark:bg-teal-800/50 dark:text-teal-300",
  },
  service: {
    border: "border-violet-300 dark:border-violet-600",
    bg: "bg-violet-50/50 dark:bg-violet-900/10",
    headerBg: "bg-violet-100 dark:bg-violet-900/30",
    badge: "bg-violet-200 text-violet-800 dark:bg-violet-800/50 dark:text-violet-300",
  },
  component: {
    border: "border-rose-300 dark:border-rose-600",
    bg: "bg-rose-50/50 dark:bg-rose-900/10",
    headerBg: "bg-rose-100 dark:bg-rose-900/30",
    badge: "bg-rose-200 text-rose-800 dark:bg-rose-800/50 dark:text-rose-300",
  },
};

function getModuleStyle(type: string) {
  return MODULE_TYPE_STYLES[type] || MODULE_TYPE_STYLES.module;
}

export default function UmlDiagram({ modules, onModuleClick }: UmlDiagramProps) {
  if (!modules || modules.length === 0) return null;

  const moduleNames = new Set(modules.map((m) => m.name));

  return (
    <div className="space-y-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        Repository Architecture
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-2 gap-3">
        {modules.map((mod) => {
          const style = getModuleStyle(mod.type);
          const deps = mod.dependsOn.filter((d) => moduleNames.has(d));

          return (
            <button
              key={mod.name}
              onClick={() => onModuleClick?.(mod.name)}
              className={`border rounded-lg overflow-hidden text-left hover:shadow-md transition-shadow ${style.border} ${style.bg}`}
            >
              {/* Module header */}
              <div className={`px-3 py-2 ${style.headerBg}`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {mod.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${style.badge}`}>
                    {mod.type}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  {mod.description}
                </p>
              </div>

              {/* Module body */}
              <div className="px-3 py-2 space-y-2">
                {/* Exports */}
                {mod.exports.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Key Exports
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {mod.exports.map((exp) => (
                        <span
                          key={exp}
                          className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {mod.files.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Files
                    </div>
                    <div className="space-y-0.5">
                      {mod.files.map((file) => (
                        <div
                          key={file}
                          className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate"
                        >
                          {file}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                {deps.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Depends on
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {deps.map((dep) => (
                        <span
                          key={dep}
                          className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/50 dark:bg-zinc-700/50 text-blue-600 dark:text-blue-400"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dependency flow */}
      {modules.some((m) => m.dependsOn.some((d) => moduleNames.has(d))) && (
        <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
            Dependency Flow
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {modules
              .filter((m) => m.dependsOn.some((d) => moduleNames.has(d)))
              .map((m) => (
                <span key={m.name} className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{m.name}</span>
                  {" → "}
                  {m.dependsOn.filter((d) => moduleNames.has(d)).join(", ")}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
