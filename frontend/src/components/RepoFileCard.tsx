"use client";

import type { FileChange } from "@/types";

interface RepoFileCardProps {
  file: FileChange;
  searchQuery?: string;
}

function highlightSearch(
  text: string,
  query: string | undefined
): React.ReactNode {
  if (!query || !query.trim()) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="bg-yellow-300 dark:bg-yellow-600/50 text-inherit"
        >
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

export default function RepoFileCard({ file, searchQuery }: RepoFileCardProps) {
  return (
    <div
      data-file-id={file.path}
      className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
    >
      {/* File header */}
      <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
        <span className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
          {file.path}
        </span>
        {file.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {highlightSearch(file.description, searchQuery)}
          </p>
        )}
      </div>

      {/* Side-by-side: file purpose (left) | annotations (right) */}
      <div className="flex divide-x divide-zinc-200 dark:divide-zinc-700">
        {/* Left: Purpose */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-blue-500">&#10022;</span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Purpose
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {highlightSearch(file.annotations.whatChanged, searchQuery)}
          </p>

          <div className="flex items-center gap-1.5 mb-1.5 mt-4">
            <span className="text-amber-500">&#10022;</span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Significance
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {highlightSearch(file.annotations.whyItMatters, searchQuery)}
          </p>
        </div>

        {/* Right: Key notes */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-emerald-500">&#10022;</span>
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Key Notes
            </span>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {highlightSearch(file.annotations.reviewHint, searchQuery)}
          </p>
        </div>
      </div>
    </div>
  );
}
