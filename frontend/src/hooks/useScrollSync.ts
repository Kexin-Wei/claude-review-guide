"use client";

import { useRef, useCallback, useState } from "react";

export function useScrollSync() {
  const middleRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const isProgrammaticScroll = useRef(false);

  const handleMiddleScroll = useCallback(() => {
    if (!syncEnabled || isProgrammaticScroll.current) return;
    if (!middleRef.current || !rightRef.current) return;

    const middle = middleRef.current;
    const scrollRatio = middle.scrollTop / (middle.scrollHeight - middle.clientHeight || 1);

    isProgrammaticScroll.current = true;
    rightRef.current.scrollTop =
      scrollRatio * (rightRef.current.scrollHeight - rightRef.current.clientHeight);

    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false;
    });
  }, [syncEnabled]);

  const handleRightScroll = useCallback(() => {
    if (!syncEnabled || isProgrammaticScroll.current) return;
    if (!middleRef.current || !rightRef.current) return;

    const right = rightRef.current;
    const scrollRatio = right.scrollTop / (right.scrollHeight - right.clientHeight || 1);

    isProgrammaticScroll.current = true;
    middleRef.current.scrollTop =
      scrollRatio * (middleRef.current.scrollHeight - middleRef.current.clientHeight);

    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false;
    });
  }, [syncEnabled]);

  const scrollToFile = useCallback(
    (fileId: string) => {
      if (!middleRef.current) return;
      const el = middleRef.current.querySelector(`[data-file-id="${fileId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    []
  );

  return {
    middleRef,
    rightRef,
    syncEnabled,
    setSyncEnabled,
    handleMiddleScroll,
    handleRightScroll,
    scrollToFile,
  };
}
