"use client";

import { useState, useEffect, useCallback } from "react";

interface TopBarProps {
  repoPath: string;
  onRepoPathChange: (path: string) => void;
  repoValid: boolean | null;
  repoBranch: string;
}

export default function TopBar({
  repoPath,
  onRepoPathChange,
  repoValid,
  repoBranch,
}: TopBarProps) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add("dark");
  }, []);

  const toggleDark = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          Repo Path
        </label>
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={repoPath}
            onChange={(e) => onRepoPathChange(e.target.value)}
            placeholder="/home/user/project"
            className="w-full px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {repoValid !== null && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm">
              {repoValid ? (
                <span className="text-green-500" title={`Branch: ${repoBranch}`}>
                  ✓
                </span>
              ) : (
                <span className="text-red-500" title="Not a valid git repo">
                  ✗
                </span>
              )}
            </span>
          )}
        </div>
        {repoValid && repoBranch && (
          <span className="text-xs text-zinc-400 font-mono">{repoBranch}</span>
        )}
      </div>

      <button
        onClick={toggleDark}
        className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
        title="Toggle dark mode"
      >
        {darkMode ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </div>
  );
}
