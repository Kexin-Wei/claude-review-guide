"use client";

import type { TabType, DiffScope, CommitInfo } from "@/types";
import { useState, useEffect } from "react";

interface ScopeSelectorProps {
  activeTab: TabType;
  scope: DiffScope;
  onScopeChange: (scope: DiffScope) => void;
  commitRef: string;
  onCommitRefChange: (ref: string) => void;
  fromRef: string;
  onFromRefChange: (ref: string) => void;
  toRef: string;
  onToRefChange: (ref: string) => void;
  onAnalyze: () => void;
  loading: boolean;
  repoPath: string;
}

export default function ScopeSelector({
  activeTab,
  scope,
  onScopeChange,
  commitRef,
  onCommitRefChange,
  fromRef,
  onFromRefChange,
  toRef,
  onToRefChange,
  onAnalyze,
  loading,
  repoPath,
}: ScopeSelectorProps) {
  const [recentCommits, setRecentCommits] = useState<CommitInfo[]>([]);
  const [commitMode, setCommitMode] = useState<"single" | "range">("single");

  useEffect(() => {
    if (activeTab === "commit-analysis" && repoPath) {
      fetch(`/api/repo/commits?path=${encodeURIComponent(repoPath)}`)
        .then((r) => r.json())
        .then((data) => setRecentCommits(data.commits || []))
        .catch(() => {});
    }
  }, [activeTab, repoPath]);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
      {activeTab === "git-changes" && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Scope
          </label>
          <select
            value={scope}
            onChange={(e) => onScopeChange(e.target.value as DiffScope)}
            className="px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All uncommitted</option>
            <option value="staged">Staged only</option>
            <option value="unstaged">Unstaged only</option>
            <option value="branch">Branch diff</option>
          </select>
        </div>
      )}

      {activeTab === "commit-analysis" && (
        <div className="flex items-center gap-3 flex-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setCommitMode("single");
                onScopeChange("commit");
              }}
              className={`px-2 py-1 text-xs rounded ${
                commitMode === "single"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              Single
            </button>
            <button
              onClick={() => {
                setCommitMode("range");
                onScopeChange("range");
              }}
              className={`px-2 py-1 text-xs rounded ${
                commitMode === "range"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              }`}
            >
              Range
            </button>
          </div>

          {commitMode === "single" ? (
            <input
              type="text"
              value={commitRef}
              onChange={(e) => onCommitRefChange(e.target.value)}
              placeholder="Commit ref (e.g. HEAD, abc1234)"
              className="flex-1 max-w-xs px-2 py-1 text-sm font-mono rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={fromRef}
                onChange={(e) => onFromRefChange(e.target.value)}
                placeholder="From ref"
                className="w-32 px-2 py-1 text-sm font-mono rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
              <span className="text-zinc-400">..</span>
              <input
                type="text"
                value={toRef}
                onChange={(e) => onToRefChange(e.target.value)}
                placeholder="To ref"
                className="w-32 px-2 py-1 text-sm font-mono rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          {recentCommits.length > 0 && (
            <div className="relative group">
              <button className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-zinc-300 dark:border-zinc-600 rounded">
                Recent
              </button>
              <div className="absolute left-0 top-full mt-1 w-80 max-h-48 overflow-y-auto bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg z-50 hidden group-hover:block">
                {recentCommits.map((c) => (
                  <button
                    key={c.hash}
                    onClick={() => {
                      onCommitRefChange(c.hash.slice(0, 8));
                      setCommitMode("single");
                      onScopeChange("commit");
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-700 flex gap-2"
                  >
                    <span className="font-mono text-blue-600 dark:text-blue-400 shrink-0">
                      {c.hash.slice(0, 7)}
                    </span>
                    <span className="truncate text-zinc-700 dark:text-zinc-300">
                      {c.message}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "code-analysis" && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Analyze full repository architecture and features
        </span>
      )}

      <div className="ml-auto">
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {loading && (
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
    </div>
  );
}
