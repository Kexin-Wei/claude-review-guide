"use client";

import type { FileChange } from "@/types";

interface FileContentViewProps {
  files: FileChange[];
  searchQuery?: string;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightSearch(
  text: string,
  query: string | undefined
): React.ReactNode {
  if (!query || !query.trim()) return text;
  try {
    const parts = text.split(new RegExp(`(${escapeRegex(query)})`, "gi"));
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

export default function FileContentView({
  files,
  searchQuery,
}: FileContentViewProps) {
  const filesWithContent = files.filter((f) => f.diff);

  if (filesWithContent.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-sm">
        Select a feature group to view file contents
      </div>
    );
  }

  return (
    <div className="font-mono text-xs leading-5">
      {filesWithContent.map((file) => {
        const lines = file.diff.split("\n");
        return (
          <div key={file.path} data-file-id={file.path} className="mb-6">
            <div className="sticky top-0 z-10 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-y border-zinc-200 dark:border-zinc-700 font-sans text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {file.path}
            </div>
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="flex hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
              >
                <span className="w-12 shrink-0 text-right pr-2 text-zinc-400 select-none border-r border-zinc-200 dark:border-zinc-700">
                  {idx + 1}
                </span>
                <span className="flex-1 px-2 whitespace-pre text-zinc-700 dark:text-zinc-300">
                  {highlightSearch(line, searchQuery)}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
