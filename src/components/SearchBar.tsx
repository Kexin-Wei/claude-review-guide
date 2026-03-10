"use client";

import { useState, useCallback } from "react";

interface SearchBarProps {
  onSearchChange: (query: string) => void;
}

export default function SearchBar({ onSearchChange }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      onSearchChange(value);
    },
    [onSearchChange]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    onSearchChange("");
  }, [onSearchChange]);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <svg
        className="w-4 h-4 text-zinc-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search across diff and annotations..."
        className="flex-1 text-sm bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder:text-zinc-400"
        onKeyDown={(e) => {
          if (e.key === "Escape") handleClear();
        }}
      />
      {query && (
        <button
          onClick={handleClear}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          Clear
        </button>
      )}
    </div>
  );
}
