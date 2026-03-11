"use client";

import { useState, useCallback, useRef } from "react";
import type { AnalysisResult, DiffScope } from "@/types";

interface UseAnalysisReturn {
  result: AnalysisResult | null;
  loading: boolean;
  error: string | null;
  message: string | null;
  analyze: (
    repoPath: string,
    scope: DiffScope,
    options?: { commitRef?: string; fromRef?: string; toRef?: string }
  ) => Promise<void>;
  analyzeRepo: (repoPath: string) => Promise<void>;
  showDiffResult: () => void;
  showRepoResult: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Cache results so switching tabs restores them
  const diffResultRef = useRef<AnalysisResult | null>(null);
  const repoResultRef = useRef<AnalysisResult | null>(null);

  const analyze = useCallback(
    async (
      repoPath: string,
      scope: DiffScope,
      options?: { commitRef?: string; fromRef?: string; toRef?: string }
    ) => {
      setLoading(true);
      setError(null);
      setMessage(null);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoPath, scope, ...options }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Analysis failed");
          return;
        }

        if (data.message) {
          setMessage(data.message);
        }

        diffResultRef.current = data;
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const analyzeRepo = useCallback(async (repoPath: string) => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/analyze-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoPath }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Repo analysis failed");
        return;
      }

      if (data.message) {
        setMessage(data.message);
      }

      repoResultRef.current = data;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const showDiffResult = useCallback(() => {
    setResult(diffResultRef.current);
    setError(null);
    setMessage(null);
  }, []);

  const showRepoResult = useCallback(() => {
    setResult(repoResultRef.current);
    setError(null);
    setMessage(null);
  }, []);

  return {
    result,
    loading,
    error,
    message,
    analyze,
    analyzeRepo,
    showDiffResult,
    showRepoResult,
  };
}
