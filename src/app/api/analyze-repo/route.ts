import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import path from "path";
import { validateRepo } from "@/lib/git";
import { scanRepo } from "@/lib/repo-scanner";
import { analyzeRepo } from "@/lib/claude";
import {
  hashContent,
  getCachedAnalysis,
  saveAnalysis,
} from "@/lib/cache";
import type { RepoAnalysisRequest, FeatureGroup } from "@/types";

const execFileAsync = promisify(execFile);

const MAX_FILE_SIZE = 50_000; // 50KB per file content

async function attachFileContents(
  groups: FeatureGroup[],
  repoPath: string
): Promise<FeatureGroup[]> {
  // Skip architecture groups — they're structural overviews
  return Promise.all(
    groups.map(async (group) => {
      if (group.category.toLowerCase().includes("architecture")) return group;

      const filesWithContent = await Promise.all(
        group.files.map(async (file) => {
          try {
            const content = await readFile(
              path.join(repoPath, file.path),
              "utf-8"
            );
            return {
              ...file,
              diff: content.length > MAX_FILE_SIZE
                ? content.slice(0, MAX_FILE_SIZE) + "\n// ... truncated"
                : content,
            };
          } catch {
            return file;
          }
        })
      );
      return { ...group, files: filesWithContent };
    })
  );
}

async function getDirtyState(repoPath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "git", ["status", "--porcelain"],
      { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout;
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  let body: RepoAnalysisRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repoPath, repoScope = "committed" } = body;

  if (!repoPath) {
    return NextResponse.json(
      { error: "repoPath is required" },
      { status: 400 }
    );
  }

  const repo = await validateRepo(repoPath);
  if (!repo.valid) {
    return NextResponse.json(
      { error: "Invalid git repository" },
      { status: 400 }
    );
  }

  try {
    const includeUncommitted = repoScope === "all";
    const snapshot = await scanRepo(repoPath, includeUncommitted);

    // Cache key: hash of file tree + dirty state when including uncommitted
    const dirtyState = includeUncommitted ? await getDirtyState(repoPath) : "";
    const cacheKey = hashContent(
      snapshot.fileTree.join("\n") + "\n---\n" + repoScope + "\n" + dirtyState
    );
    const cached = await getCachedAnalysis(cacheKey);

    if (cached) {
      // Re-attach file contents (they aren't cached to keep cache small)
      const groupsWithContent = await attachFileContents(cached.groups, repoPath);
      return NextResponse.json({
        id: cached.id,
        groups: groupsWithContent,
        rawDiff: cached.rawDiff,
        analyzedAt: cached.createdAt.toISOString(),
        cached: true,
        type: "repo",
        fileTree: snapshot.fileTree,
        umlStructure: cached.umlStructure,
      });
    }

    const { groups, umlStructure } = await analyzeRepo(snapshot);
    const groupsWithContent = await attachFileContents(groups, repoPath);

    const id = await saveAnalysis(
      repoPath,
      cacheKey,
      "repo-analysis",
      groups,
      "",
      umlStructure
    );

    return NextResponse.json({
      id,
      groups: groupsWithContent,
      rawDiff: "",
      analyzedAt: new Date().toISOString(),
      cached: false,
      type: "repo",
      fileTree: snapshot.fileTree,
      umlStructure,
    });
  } catch (error) {
    console.error("Repo analysis error:", error);
    return NextResponse.json(
      {
        error: "Repo analysis failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
