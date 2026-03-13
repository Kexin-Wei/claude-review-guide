"use client";

import { useMemo } from "react";
import { parseDiff } from "@/lib/diff-parser";

interface DiffViewProps {
  rawDiff: string;
  searchQuery?: string;
}

function highlightSearch(text: string, query: string | undefined): React.ReactNode {
  if (!query || !query.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-300 dark:bg-yellow-600/50 text-inherit">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function DiffView({ rawDiff, searchQuery }: DiffViewProps) {
  const files = useMemo(() => parseDiff(rawDiff), [rawDiff]);

  if (!rawDiff) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-sm">
        Run an analysis to see diffs here
      </div>
    );
  }

  return (
    <div className="font-mono text-xs leading-5">
      {files.map((file) => (
        <div key={file.path} data-file-id={file.path} className="mb-6">
          <div className="sticky top-0 z-10 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-y border-zinc-200 dark:border-zinc-700 font-sans text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {file.path}
            {file.oldPath && (
              <span className="text-zinc-400 ml-2">
                (renamed from {file.oldPath})
              </span>
            )}
          </div>

          {file.hunks.map((hunk, hunkIdx) => (
            <div key={hunkIdx}>
              <div className="px-3 py-0.5 text-zinc-400 bg-blue-50/50 dark:bg-blue-900/10 border-b border-zinc-100 dark:border-zinc-800">
                @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
              </div>
              {hunk.lines.map((line, lineIdx) => {
                const bgColor =
                  line.type === "add"
                    ? "bg-green-50 dark:bg-green-900/20"
                    : line.type === "remove"
                    ? "bg-red-50 dark:bg-red-900/20"
                    : "";
                const textColor =
                  line.type === "add"
                    ? "text-green-800 dark:text-green-300"
                    : line.type === "remove"
                    ? "text-red-800 dark:text-red-300"
                    : "text-zinc-700 dark:text-zinc-300";
                const prefix =
                  line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";

                return (
                  <div
                    key={lineIdx}
                    className={`flex ${bgColor} hover:brightness-95 dark:hover:brightness-110`}
                  >
                    <span className="w-10 shrink-0 text-right pr-1 text-zinc-400 select-none border-r border-zinc-200 dark:border-zinc-700">
                      {line.oldLineNumber ?? ""}
                    </span>
                    <span className="w-10 shrink-0 text-right pr-1 text-zinc-400 select-none border-r border-zinc-200 dark:border-zinc-700">
                      {line.newLineNumber ?? ""}
                    </span>
                    <span className={`w-4 shrink-0 text-center select-none ${textColor}`}>
                      {prefix}
                    </span>
                    <span className={`flex-1 px-1 whitespace-pre ${textColor}`}>
                      {highlightSearch(line.content, searchQuery)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
