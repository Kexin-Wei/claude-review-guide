"use client";

import { useState } from "react";
import type { FeatureGroup } from "@/types";

interface FeatureGroupCardProps {
  group: FeatureGroup;
  reviewedFiles: Set<string>;
  onToggleFileReview: (groupId: string, filePath: string) => void;
  onFileClick: (filePath: string) => void;
  onGroupClick: (group: FeatureGroup) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "bug-fix": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  feature: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  refactor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  test: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  config: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  docs: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  performance: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  security: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  style: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  dependency: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  architecture: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "data-layer": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  api: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  ui: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  utility: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
};

function getCategoryColor(category: string): string {
  for (const [key, value] of Object.entries(CATEGORY_COLORS)) {
    if (category.toLowerCase().includes(key)) return value;
  }
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
}

export default function FeatureGroupCard({
  group,
  reviewedFiles,
  onToggleFileReview,
  onFileClick,
  onGroupClick,
}: FeatureGroupCardProps) {
  const [expanded, setExpanded] = useState(true);
  const reviewedCount = group.files.filter((f) =>
    reviewedFiles.has(`${group.id}:${f.path}`)
  ).length;

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => {
          onGroupClick(group);
          setExpanded(!expanded);
        }}
        className="w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-start gap-2">
          <svg
            className={`w-3 h-3 mt-1 shrink-0 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M6 4l8 6-8 6V4z" />
          </svg>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {group.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-400">
                {group.files.length} file{group.files.length !== 1 ? "s" : ""}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${getCategoryColor(
                  group.category
                )}`}
              >
                {group.category}
              </span>
            </div>
          </div>
          {reviewedCount > 0 && (
            <span className="text-[10px] text-green-600 dark:text-green-400 font-mono">
              {reviewedCount}/{group.files.length}
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-700/50">
          {group.files.map((file) => {
            const fileKey = `${group.id}:${file.path}`;
            const isReviewed = reviewedFiles.has(fileKey);
            return (
              <div
                key={file.path}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
              >
                <input
                  type="checkbox"
                  checked={isReviewed}
                  onChange={() => onToggleFileReview(group.id, file.path)}
                  className="h-3 w-3 rounded border-zinc-300 text-green-600 focus:ring-green-500 shrink-0"
                />
                <button
                  onClick={() => onFileClick(file.path)}
                  className={`text-xs font-mono truncate text-left hover:text-blue-600 dark:hover:text-blue-400 ${
                    isReviewed
                      ? "line-through text-zinc-400 dark:text-zinc-500"
                      : "text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  {file.path}
                  {file.lineRange && (
                    <span className="text-zinc-400 ml-1">
                      (L{file.lineRange})
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
