"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const MIN_SIDEBAR_PERCENT = 15;
const MAX_SIDEBAR_PERCENT = 40;
const STORAGE_KEY = "code-review-sidebar-width";
const DEFAULT_WIDTH = 25;

export function useResizableSidebar() {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSidebarWidth(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sidebarWidth));
  }, [sidebarWidth]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(MIN_SIDEBAR_PERCENT, Math.min(x, MAX_SIDEBAR_PERCENT));
      setSidebarWidth(clamped);
    };

    const onMouseUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return { sidebarWidth, containerRef, onMouseDown };
}
