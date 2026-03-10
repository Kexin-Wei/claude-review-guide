import { NextRequest, NextResponse } from "next/server";
import { getRecentCommits } from "@/lib/git";

export async function GET(request: NextRequest) {
  const repoPath = request.nextUrl.searchParams.get("path");
  const count = parseInt(
    request.nextUrl.searchParams.get("count") ?? "10",
    10
  );

  if (!repoPath) {
    return NextResponse.json(
      { error: "path parameter required" },
      { status: 400 }
    );
  }

  try {
    const commits = await getRecentCommits(repoPath, count);
    return NextResponse.json({ commits });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get commits", details: String(error) },
      { status: 500 }
    );
  }
}
