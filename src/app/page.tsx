"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import TopBar from "@/components/TopBar";
import TabBar from "@/components/TabBar";
import ScopeSelector from "@/components/ScopeSelector";
import ThreeColumnLayout from "@/components/ThreeColumnLayout";
import FeatureGroupCard from "@/components/FeatureGroupCard";
import DiffView from "@/components/DiffView";
import AnnotationCard from "@/components/AnnotationCard";
import SearchBar from "@/components/SearchBar";
import ScrollSyncToggle from "@/components/ScrollSyncToggle";
import { useAnalysis } from "@/hooks/useAnalysis";
import { useScrollSync } from "@/hooks/useScrollSync";
import type { TabType, DiffScope, FeatureGroup, FileChange } from "@/types";

const API_KEY_STORAGE = "code-review-api-key";
const REPO_PATH_STORAGE = "code-review-repo-path";

export default function Home() {
  // Persistent state
  const [repoPath, setRepoPath] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [repoValid, setRepoValid] = useState<boolean | null>(null);
  const [repoBranch, setRepoBranch] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("git-changes");
  const [scope, setScope] = useState<DiffScope>("all");
  const [commitRef, setCommitRef] = useState("");
  const [fromRef, setFromRef] = useState("");
  const [toRef, setToRef] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewedFiles, setReviewedFiles] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Analysis hook
  const { result, loading, error, message, analyze } = useAnalysis();

  // Scroll sync
  const {
    middleRef,
    rightRef,
    syncEnabled,
    setSyncEnabled,
    handleMiddleScroll,
    handleRightScroll,
    scrollToFile,
  } = useScrollSync();

  // Load persisted values
  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE);
    const savedPath = localStorage.getItem(REPO_PATH_STORAGE);
    if (savedKey) setApiKey(savedKey);
    if (savedPath) setRepoPath(savedPath);
  }, []);

  // Persist API key
  useEffect(() => {
    if (apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey);
  }, [apiKey]);

  // Persist and validate repo path
  const validateTimerRef = useRef<NodeJS.Timeout>(undefined);
  useEffect(() => {
    if (repoPath) localStorage.setItem(REPO_PATH_STORAGE, repoPath);
    if (!repoPath) {
      setRepoValid(null);
      return;
    }
    clearTimeout(validateTimerRef.current);
    validateTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/repo/validate?path=${encodeURIComponent(repoPath)}`
        );
        const data = await res.json();
        setRepoValid(data.valid);
        setRepoBranch(data.branch || "");
      } catch {
        setRepoValid(false);
      }
    }, 500);
  }, [repoPath]);

  const handleAnalyze = useCallback(() => {
    if (!repoPath || !apiKey) return;
    analyze(repoPath, scope, apiKey, { commitRef, fromRef, toRef });
  }, [repoPath, apiKey, scope, commitRef, fromRef, toRef, analyze]);

  const handleToggleFileReview = useCallback(
    (groupId: string, filePath: string) => {
      setReviewedFiles((prev) => {
        const next = new Set(prev);
        const key = `${groupId}:${filePath}`;
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    []
  );

  const handleFileClick = useCallback(
    (filePath: string) => {
      scrollToFile(filePath);
    },
    [scrollToFile]
  );

  const handleGroupClick = useCallback(
    (group: FeatureGroup) => {
      setSelectedGroup(group.id);
      if (group.files.length > 0) {
        scrollToFile(group.files[0].path);
      }
    },
    [scrollToFile]
  );

  // Determine which files to show based on selected group
  const displayFiles: FileChange[] =
    result?.groups && selectedGroup
      ? result.groups.find((g) => g.id === selectedGroup)?.files || []
      : result?.groups?.flatMap((g) => g.files) || [];

  // Build the diff string for the selected view
  const displayDiff =
    selectedGroup && result?.groups
      ? result.groups
          .find((g) => g.id === selectedGroup)
          ?.files.map((f) => f.diff)
          .filter(Boolean)
          .join("\n") || result.rawDiff
      : result?.rawDiff || "";

  // Count total/reviewed files
  const totalFiles =
    result?.groups?.reduce((acc, g) => acc + g.files.length, 0) || 0;
  const reviewedCount = reviewedFiles.size;

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <TopBar
        repoPath={repoPath}
        onRepoPathChange={setRepoPath}
        repoValid={repoValid}
        repoBranch={repoBranch}
        apiKey={apiKey}
        onApiKeyChange={setApiKey}
      />

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <ScopeSelector
        activeTab={activeTab}
        scope={scope}
        onScopeChange={setScope}
        commitRef={commitRef}
        onCommitRefChange={setCommitRef}
        fromRef={fromRef}
        onFromRefChange={setFromRef}
        toRef={toRef}
        onToRefChange={setToRef}
        onAnalyze={handleAnalyze}
        loading={loading}
        repoPath={repoPath}
      />

      {/* Status messages */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400 text-sm">
              {error}
            </span>
            <button
              onClick={handleAnalyze}
              className="text-xs text-red-600 dark:text-red-400 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      {message && !error && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <span className="text-amber-700 dark:text-amber-400 text-sm">
            {message}
          </span>
        </div>
      )}
      {result?.cached && (
        <div className="px-4 py-1 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-200 dark:border-blue-800">
          <span className="text-blue-600 dark:text-blue-400 text-xs">
            Cached result from {new Date(result.analyzedAt).toLocaleString()}
          </span>
        </div>
      )}

      {/* Main three-column layout */}
      <ThreeColumnLayout
        left={
          <div className="p-3 space-y-3">
            {totalFiles > 0 && (
              <div className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                {reviewedCount}/{totalFiles} files reviewed
              </div>
            )}

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
                  />
                ))}
              </div>
            )}

            {result?.groups?.map((group) => (
              <FeatureGroupCard
                key={group.id}
                group={group}
                reviewedFiles={reviewedFiles}
                onToggleFileReview={handleToggleFileReview}
                onFileClick={handleFileClick}
                onGroupClick={handleGroupClick}
              />
            ))}

            {!loading && !result && (
              <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
                <p className="font-medium">No analysis yet</p>
                <p className="mt-1 text-xs">
                  Set a repo path and API key, then click Analyze
                </p>
              </div>
            )}
          </div>
        }
        middle={
          <div className="flex flex-col h-full">
            <SearchBar onSearchChange={setSearchQuery} />
            <div
              className="flex-1 overflow-y-auto"
              ref={middleRef}
              onScroll={handleMiddleScroll}
            >
              <DiffView rawDiff={displayDiff} searchQuery={searchQuery} />
            </div>
          </div>
        }
        right={
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                AI Annotations
              </span>
              <ScrollSyncToggle
                enabled={syncEnabled}
                onToggle={() => setSyncEnabled(!syncEnabled)}
              />
            </div>
            <div
              className="flex-1 overflow-y-auto p-3"
              ref={rightRef}
              onScroll={handleRightScroll}
            >
              {loading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3"
                    >
                      <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                        <div className="h-2 w-3/4 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                        <div className="h-2 w-2/3 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {displayFiles.map((file, idx) => (
                <AnnotationCard
                  key={`${file.path}-${idx}`}
                  file={file}
                  searchQuery={searchQuery}
                />
              ))}

              {!loading && displayFiles.length === 0 && (
                <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-sm">
                  Annotations will appear here
                </div>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}
