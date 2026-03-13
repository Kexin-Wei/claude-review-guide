"use client";

interface ScrollSyncToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export default function ScrollSyncToggle({
  enabled,
  onToggle,
}: ScrollSyncToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`p-1 rounded text-xs ${
        enabled
          ? "text-blue-600 dark:text-blue-400"
          : "text-zinc-400 dark:text-zinc-500"
      } hover:bg-zinc-100 dark:hover:bg-zinc-800`}
      title={enabled ? "Scroll sync enabled" : "Scroll sync disabled"}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        {enabled ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
          />
        )}
      </svg>
    </button>
  );
}
