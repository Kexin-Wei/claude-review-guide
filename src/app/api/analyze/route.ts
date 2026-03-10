import { NextRequest, NextResponse } from "next/server";
import { getDiff, validateRepo } from "@/lib/git";
import { analyzeDiff } from "@/lib/claude";
import { hashDiff, getCachedAnalysis, saveAnalysis } from "@/lib/cache";
import type { AnalyzeRequest } from "@/types";

export async function POST(request: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repoPath, scope, commitRef, fromRef, toRef, apiKey } = body;

  if (!repoPath || !scope || !apiKey) {
    return NextResponse.json(
      { error: "repoPath, scope, and apiKey are required" },
      { status: 400 }
    );
  }

  // Validate repo
  const repo = await validateRepo(repoPath);
  if (!repo.valid) {
    return NextResponse.json(
      { error: "Invalid git repository" },
      { status: 400 }
    );
  }

  try {
    // Get diff
    const diff = await getDiff(repoPath, scope, commitRef, fromRef, toRef);

    if (!diff.trim()) {
      return NextResponse.json({
        id: "",
        groups: [],
        rawDiff: "",
        analyzedAt: new Date().toISOString(),
        cached: false,
        message: "No changes found",
      });
    }

    // Check cache
    const diffHash = hashDiff(diff);
    const cached = await getCachedAnalysis(diffHash);

    if (cached) {
      return NextResponse.json({
        id: cached.id,
        groups: cached.groups,
        rawDiff: cached.rawDiff,
        analyzedAt: cached.createdAt.toISOString(),
        cached: true,
      });
    }

    // Analyze with Claude
    const groups = await analyzeDiff(diff, apiKey);

    // Save to cache
    const id = await saveAnalysis(repoPath, diffHash, scope, groups, diff);

    return NextResponse.json({
      id,
      groups,
      rawDiff: diff,
      analyzedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      {
        error: "Analysis failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
