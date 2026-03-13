"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMemo } from "react";

import TopBar from "@/components/TopBar";
import TabBar from "@/components/TabBar";
import ScopeSelector from "@/components/ScopeSelector";
import TwoColumnLayout from "@/components/TwoColumnLayout";
import FeatureGroupCard from "@/components/FeatureGroupCard";
import UmlDiagram from "@/components/UmlDiagram";
import DiffView from "@/components/DiffView";
import AnnotationCard from "@/components/AnnotationCard";
import RepoFileCard from "@/components/RepoFileCard";
import SearchBar from "@/components/SearchBar";
import { useAnalysis } from "@/hooks/useAnalysis";
import type { TabType, DiffScope, RepoScope, FeatureGroup, FileChange } from "@/types";

const REPO_PATH_STORAGE = "code-review-repo-path";

// Vibrant color palette for code block highlights — each block gets a unique color
const BLOCK_COLORS = [
  { bg: "rgba(59,130,246,0.12)", border: "rgb(59,130,246)" },   // blue
  { bg: "rgba(168,85,247,0.12)", border: "rgb(168,85,247)" },   // purple
  { bg: "rgba(236,72,153,0.12)", border: "rgb(236,72,153)" },   // pink
  { bg: "rgba(14,165,233,0.12)", border: "rgb(14,165,233)" },   // sky
  { bg: "rgba(245,158,11,0.12)", border: "rgb(245,158,11)" },   // amber
  { bg: "rgba(16,185,129,0.12)", border: "rgb(16,185,129)" },   // emerald
  { bg: "rgba(239,68,68,0.12)", border: "rgb(239,68,68)" },     // red
  { bg: "rgba(99,102,241,0.12)", border: "rgb(99,102,241)" },   // indigo
  { bg: "rgba(34,211,238,0.12)", border: "rgb(34,211,238)" },   // cyan
  { bg: "rgba(251,146,60,0.12)", border: "rgb(251,146,60)" },   // orange
  { bg: "rgba(163,230,53,0.12)", border: "rgb(163,230,53)" },   // lime
  { bg: "rgba(232,121,249,0.12)", border: "rgb(232,121,249)" }, // fuchsia
  { bg: "rgba(56,189,248,0.12)", border: "rgb(56,189,248)" },   // light blue
  { bg: "rgba(74,222,128,0.12)", border: "rgb(74,222,128)" },   // green
  { bg: "rgba(251,191,36,0.12)", border: "rgb(251,191,36)" },   // yellow
  { bg: "rgba(244,114,182,0.12)", border: "rgb(244,114,182)" }, // rose
];

function buildLineColorMap(blocks?: import("@/types").CodeBlock[]): Map<number, { bg: string; border: string }> {
  const map = new Map<number, { bg: string; border: string }>();
  if (!blocks) return map;
  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx];
    const color = BLOCK_COLORS[idx % BLOCK_COLORS.length];
    for (let i = block.lineStart; i <= block.lineEnd; i++) {
      map.set(i, color);
    }
  }
  return map;
}

export default function Home() {
  // Persistent state
  const [repoPath, setRepoPath] = useState("");
  const [repoValid, setRepoValid] = useState<boolean | null>(null);
  const [repoBranch, setRepoBranch] = useState("");

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>("code-analysis");
  const [scope, setScope] = useState<DiffScope>("all");
  const [commitRef, setCommitRef] = useState("");
  const [fromRef, setFromRef] = useState("");
  const [toRef, setToRef] = useState("");
  const [repoScope, setRepoScope] = useState<RepoScope>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewedFiles, setReviewedFiles] = useState<Set<string>>(new Set());
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Analysis hook
  const {
    result, loading, error, message,
    analyze, analyzeRepo,
    showDiffResult, showRepoResult,
  } = useAnalysis();

  // Load persisted values
  useEffect(() => {
    const savedPath = localStorage.getItem(REPO_PATH_STORAGE);
    if (savedPath) setRepoPath(savedPath);
  }, []);

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

  // Restore cached results when switching tabs
  const handleTabChange = useCallback(
    (tab: TabType) => {
      setActiveTab(tab);
      setSelectedGroup(null);
      setSearchQuery("");
      if (tab === "code-analysis") {
        showRepoResult();
      } else {
        showDiffResult();
      }
      // Set appropriate default scope for each tab
      if (tab === "commit-analysis") {
        setScope("commit");
      } else if (tab === "git-changes") {
        setScope("all");
      }
    },
    [showDiffResult, showRepoResult]
  );

  const handleAnalyze = useCallback(() => {
    if (!repoPath) return;
    if (activeTab === "code-analysis") {
      analyzeRepo(repoPath, repoScope);
    } else {
      analyze(repoPath, scope, { commitRef, fromRef, toRef });
    }
  }, [repoPath, activeTab, repoScope, scope, commitRef, fromRef, toRef, analyze, analyzeRepo]);

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

  const scrollToFile = useCallback((fileId: string) => {
    if (!contentRef.current) return;
    const el = contentRef.current.querySelector(`[data-file-id="${fileId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleFileClick = useCallback(
    (filePath: string, lineStart?: number, lineEnd?: number) => {
      if (lineStart && contentRef.current) {
        const fileEl = contentRef.current.querySelector(`[data-file-id="${filePath}"]`);
        if (!fileEl) { scrollToFile(filePath); return; }

        const end = lineEnd || lineStart;
        const highlightClass = ["bg-yellow-100", "dark:bg-yellow-900/30"];
        const lines: Element[] = [];

        for (let i = lineStart; i <= end; i++) {
          const el = fileEl.querySelector(`[data-line="${i}"]`);
          if (el) lines.push(el);
        }

        if (lines.length > 0) {
          lines[0].scrollIntoView({ behavior: "smooth", block: "center" });
          for (const el of lines) {
            el.classList.add(...highlightClass);
          }
          setTimeout(() => {
            for (const el of lines) {
              el.classList.remove(...highlightClass);
            }
          }, 2000);
          return;
        }
      }
      scrollToFile(filePath);
    },
    [scrollToFile]
  );

  const handleUmlModuleClick = useCallback(
    (moduleName: string) => {
      // Find a group whose title or category matches this module name
      const group = result?.groups?.find(
        (g) =>
          g.title.toLowerCase().includes(moduleName.toLowerCase()) ||
          g.category.toLowerCase().includes(moduleName.toLowerCase())
      );
      if (group) {
        setSelectedGroup(group.id);
        if (group.files.length > 0) {
          scrollToFile(group.files[0].path);
        }
      }
    },
    [result, scrollToFile]
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

  // Build the diff string for the selected view (per-file for diff tab)
  const fileDiffs = useMemo(() => {
    if (!displayFiles.length) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const file of displayFiles) {
      if (file.diff) map.set(file.path, file.diff);
    }
    return map;
  }, [displayFiles]);

  // Count total/reviewed files
  const totalFiles =
    result?.groups?.reduce((acc, g) => acc + g.files.length, 0) || 0;
  const reviewedCount = reviewedFiles.size;

  const isRepoAnalysis = result?.type === "repo";

  // Check if the selected group is the Architecture group
  const selectedGroupData = result?.groups?.find((g) => g.id === selectedGroup);
  const isArchitectureView =
    activeTab === "code-analysis" &&
    selectedGroupData?.category?.toLowerCase().includes("architecture");

  // Shared left column content
  const leftColumn = (
    <div className="p-3 space-y-3">
      {totalFiles > 0 && (
        <div className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
          {activeTab === "git-changes"
            ? `${reviewedCount}/${totalFiles} files reviewed`
            : `${totalFiles} files analyzed`}
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

      {/* Feature groups */}
      {result?.groups?.map((group) => (
        <FeatureGroupCard
          key={group.id}
          group={group}
          reviewedFiles={reviewedFiles}
          onToggleFileReview={handleToggleFileReview}
          onFileClick={handleFileClick}
          onGroupClick={handleGroupClick}
          showReviewCheckboxes={activeTab === "git-changes"}
        />
      ))}

      {!loading && !result && (
        <div className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm">
          <p className="font-medium">No analysis yet</p>
          <p className="mt-1 text-xs">Set a repo path, then click Analyze</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <TopBar
        repoPath={repoPath}
        onRepoPathChange={setRepoPath}
        repoValid={repoValid}
        repoBranch={repoBranch}
      />

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      <ScopeSelector
        activeTab={activeTab}
        scope={scope}
        onScopeChange={setScope}
        repoScope={repoScope}
        onRepoScopeChange={setRepoScope}
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

      {/* Unified two-column layout for all tabs */}
      <TwoColumnLayout
        sidebar={leftColumn}
        content={
          <div className="flex flex-col h-full">
            <SearchBar onSearchChange={setSearchQuery} />
            <div ref={contentRef} className="flex-1 overflow-y-auto">
              {loading && (
                <div className="p-4 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-1 h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                      <div className="w-80 shrink-0 h-32 rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {/* Architecture UML view */}
              {isArchitectureView && result?.umlStructure && result.umlStructure.length > 0 ? (
                <div className="p-6">
                  <UmlDiagram
                    modules={result.umlStructure}
                    onModuleClick={handleUmlModuleClick}
                  />
                </div>
              ) : isRepoAnalysis || activeTab === "code-analysis" ? (
                /* Code Analysis: file content + annotation per row */
                displayFiles.length > 0 ? (
                  <div>
                    {displayFiles.filter((f) => f.diff).map((file, idx) => {
                      const lines = file.diff.split("\n");
                      const lineColorMap = buildLineColorMap(file.blocks);
                      return (
                        <div
                          key={`${file.path}-${idx}`}
                          data-file-id={file.path}
                          className="flex border-b border-zinc-200 dark:border-zinc-700"
                        >
                          {/* Code block */}
                          <div className="flex-1 min-w-0 overflow-x-auto font-mono text-xs leading-5">
                            <div className="sticky top-0 z-10 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 font-sans text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {file.path}
                            </div>
                            {lines.map((line, lineIdx) => {
                              const lineNum = lineIdx + 1;
                              const color = lineColorMap.get(lineNum);
                              return (
                                <div
                                  key={lineIdx}
                                  data-line={lineNum}
                                  className={`flex transition-colors duration-500 ${!color ? "hover:bg-zinc-50 dark:hover:bg-zinc-800/30" : ""}`}
                                  style={color ? {
                                    backgroundColor: color.bg,
                                    borderLeft: `3px solid ${color.border}`,
                                  } : undefined}
                                >
                                  <span className="w-12 shrink-0 text-right pr-2 text-zinc-400 select-none border-r border-zinc-200 dark:border-zinc-700">
                                    {lineNum}
                                  </span>
                                  <span className="flex-1 px-2 whitespace-pre text-zinc-700 dark:text-zinc-300">
                                    {line}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          {/* Annotation */}
                          <div className="w-80 shrink-0 border-l border-zinc-200 dark:border-zinc-700 p-3">
                            <RepoFileCard file={file} searchQuery={searchQuery} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !loading && (
                    <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-sm">
                      Run a code analysis to see file contents
                    </div>
                  )
                )
              ) : (
                /* Diff Analysis: diff + annotation per row */
                displayFiles.length > 0 ? (
                  <div>
                    {displayFiles.map((file, idx) => (
                      <div
                        key={`${file.path}-${idx}`}
                        data-file-id={file.path}
                        className="flex border-b border-zinc-200 dark:border-zinc-700"
                      >
                        {/* Diff block */}
                        <div className="flex-1 min-w-0 overflow-x-auto">
                          <DiffView
                            rawDiff={fileDiffs.get(file.path) || ""}
                            searchQuery={searchQuery}
                          />
                        </div>
                        {/* Annotation */}
                        <div className="w-80 shrink-0 border-l border-zinc-200 dark:border-zinc-700 p-3">
                          <AnnotationCard file={file} searchQuery={searchQuery} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !loading && (
                    <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-sm">
                      Run an analysis to see diffs here
                    </div>
                  )
                )
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}
