"use client";

import { useResizableColumns } from "@/hooks/useResizableColumns";
import ColumnResizer from "./ColumnResizer";

interface ThreeColumnLayoutProps {
  left: React.ReactNode;
  middle: React.ReactNode;
  right: React.ReactNode;
}

export default function ThreeColumnLayout({
  left,
  middle,
  right,
}: ThreeColumnLayoutProps) {
  const { widths, containerRef, onMouseDown } = useResizableColumns();

  return (
    <div
      ref={containerRef}
      className="flex flex-1 min-h-0 overflow-hidden"
    >
      <div
        style={{ width: `${widths.left}%` }}
        className="overflow-y-auto border-r border-zinc-200 dark:border-zinc-700"
      >
        {left}
      </div>
      <ColumnResizer onMouseDown={onMouseDown("left")} />
      <div
        style={{ width: `${widths.middle}%` }}
        className="overflow-y-auto"
      >
        {middle}
      </div>
      <ColumnResizer onMouseDown={onMouseDown("right")} />
      <div
        style={{ width: `${widths.right}%` }}
        className="overflow-y-auto border-l border-zinc-200 dark:border-zinc-700"
      >
        {right}
      </div>
    </div>
  );
}
