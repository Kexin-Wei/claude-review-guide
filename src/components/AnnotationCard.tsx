"use client";

import type { FileChange } from "@/types";

interface AnnotationCardProps {
  file: FileChange;
  searchQuery?: string;
}

function highlightSearch(text: string, query: string | undefined): React.ReactNode {
  if (!query || !query.trim()) return text;
  try {
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
  } catch {
    return text;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function AnnotationCard({ file, searchQuery }: AnnotationCardProps) {
  return (
    <div
      data-file-id={file.path}
      className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 mb-4"
    >
      <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-3 font-medium">
        {file.path}
        {file.lineRange && <span className="ml-1">L{file.lineRange}</span>}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-blue-500">&#10022;</span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              What changed
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-5">
            {highlightSearch(file.annotations.whatChanged, searchQuery)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-amber-500">&#10022;</span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Why it matters
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-5">
            {highlightSearch(file.annotations.whyItMatters, searchQuery)}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-emerald-500">&#10022;</span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Review hint
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed pl-5">
            {highlightSearch(file.annotations.reviewHint, searchQuery)}
          </p>
        </div>
      </div>
    </div>
  );
}
