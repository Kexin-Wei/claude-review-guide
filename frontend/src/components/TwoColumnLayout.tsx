"use client";

import { useResizableSidebar } from "@/hooks/useResizableSidebar";
import ColumnResizer from "./ColumnResizer";

interface TwoColumnLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
}

export default function TwoColumnLayout({
  sidebar,
  content,
}: TwoColumnLayoutProps) {
  const { sidebarWidth, containerRef, onMouseDown } = useResizableSidebar();

  return (
    <div
      ref={containerRef}
      className="flex flex-1 min-h-0 overflow-hidden"
    >
      <div
        style={{ width: `${sidebarWidth}%` }}
        className="overflow-y-auto border-r border-zinc-200 dark:border-zinc-700"
      >
        {sidebar}
      </div>
      <ColumnResizer onMouseDown={onMouseDown} />
      <div className="flex-1 overflow-y-auto">
        {content}
      </div>
    </div>
  );
}
