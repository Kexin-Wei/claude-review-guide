"use client";

import type { TabType } from "@/types";

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TABS: { id: TabType; label: string }[] = [
  { id: "git-changes", label: "Git Changes" },
  { id: "commit-analysis", label: "Commit Analysis" },
  { id: "code-analysis", label: "Code Analysis" },
];

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
