"use client";

interface ColumnResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export default function ColumnResizer({ onMouseDown }: ColumnResizerProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 cursor-col-resize bg-zinc-200 dark:bg-zinc-700 hover:bg-blue-400 dark:hover:bg-blue-500 active:bg-blue-500 transition-colors shrink-0"
      role="separator"
      aria-orientation="vertical"
    />
  );
}
