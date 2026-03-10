import { NextRequest, NextResponse } from "next/server";
import { validateRepo } from "@/lib/git";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
  const repoPath = request.nextUrl.searchParams.get("path");

  if (!repoPath) {
    return NextResponse.json(
      { error: "path parameter required" },
      { status: 400 }
    );
  }

  // Validate it's an absolute path that exists
  if (!path.isAbsolute(repoPath) || !fs.existsSync(repoPath)) {
    return NextResponse.json({ valid: false, branch: "" });
  }

  const result = await validateRepo(repoPath);
  return NextResponse.json(result);
}
