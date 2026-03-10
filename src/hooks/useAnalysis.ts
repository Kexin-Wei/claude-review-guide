"use client";

import { useState, useCallback } from "react";
import type { AnalysisResult, DiffScope } from "@/types";

interface UseAnalysisReturn {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  message: string | null;
  analyze: (
    repoPath: string,
    scope: DiffScope,
    apiKey: string,
    options?: { commitRef?: string; fromRef?: string; toRef?: string }
  ) => Promise<void>;
}

export function useAnalysis(): UseAnalysisReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const analyze = useCallback(
    async (
      repoPath: string,
      scope: DiffScope,
      apiKey: string,
      options?: { commitRef?: string; fromRef?: string; toRef?: string }
    ) => {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoPath,
            scope,
            apiKey,
            ...options,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Analysis failed");
          return;
        }

        if (data.message) {
          setMessage(data.message);
        }

        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { result, loading, error, message, analyze };
}
