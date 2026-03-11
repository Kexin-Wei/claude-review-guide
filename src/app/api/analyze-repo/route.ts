import { NextRequest, NextResponse } from "next/server";
import { validateRepo } from "@/lib/git";
import { scanRepo } from "@/lib/repo-scanner";
import { analyzeRepo } from "@/lib/claude";
import {
  hashContent,
  getCachedAnalysis,
  saveAnalysis,
} from "@/lib/cache";
import type { RepoAnalysisRequest } from "@/types";

export async function POST(request: NextRequest) {
  let body: RepoAnalysisRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repoPath } = body;

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
    const snapshot = await scanRepo(repoPath);

    // Cache key: hash of file tree (changes when files are added/removed)
    const cacheKey = hashContent(snapshot.fileTree.join("\n"));
    const cached = await getCachedAnalysis(cacheKey);

    if (cached) {
      return NextResponse.json({
        id: cached.id,
        groups: cached.groups,
        rawDiff: cached.rawDiff,
        analyzedAt: cached.createdAt.toISOString(),
        cached: true,
        type: "repo",
        fileTree: snapshot.fileTree,
      });
    }

    const groups = await analyzeRepo(snapshot);

    const id = await saveAnalysis(
      repoPath,
      cacheKey,
      "repo-analysis",
      groups,
      ""
    );

    return NextResponse.json({
      id,
      groups,
      rawDiff: "",
      analyzedAt: new Date().toISOString(),
      cached: false,
      type: "repo",
      fileTree: snapshot.fileTree,
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
