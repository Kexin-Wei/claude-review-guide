"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const MIN_WIDTH_PERCENT = 15;

interface ColumnWidths {
  left: number;
  middle: number;
  right: number;
}

const STORAGE_KEY = "code-review-column-widths";
const DEFAULT_WIDTHS: ColumnWidths = { left: 25, middle: 40, right: 35 };

export function useResizableColumns() {
  const [widths, setWidths] = useState<ColumnWidths>(DEFAULT_WIDTHS);

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setWidths(JSON.parse(stored));
    } catch {}
  }, []);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"left" | "right" | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  }, [widths]);

  const onMouseDown = useCallback(
    (divider: "left" | "right") => (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = divider;
    },
    []
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;

      setWidths((prev) => {
        const next = { ...prev };
        if (draggingRef.current === "left") {
          const newLeft = Math.max(MIN_WIDTH_PERCENT, Math.min(x, 100 - prev.right - MIN_WIDTH_PERCENT));
          next.left = newLeft;
          next.middle = 100 - newLeft - prev.right;
        } else {
          const rightEdge = 100 - x;
          const newRight = Math.max(MIN_WIDTH_PERCENT, Math.min(rightEdge, 100 - prev.left - MIN_WIDTH_PERCENT));
          next.right = newRight;
          next.middle = 100 - prev.left - newRight;
        }
        // Ensure middle doesn't go below minimum
        if (next.middle < MIN_WIDTH_PERCENT) return prev;
        return next;
      });
    };

    const onMouseUp = () => {
      draggingRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return { widths, containerRef, onMouseDown };
}
