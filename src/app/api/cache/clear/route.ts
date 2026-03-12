import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analysisCache } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  let body: { repoPath: string; scope?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { repoPath, scope } = body;

  if (!repoPath) {
    return NextResponse.json({ error: "repoPath is required" }, { status: 400 });
  }

  const conditions = scope
    ? and(eq(analysisCache.repoPath, repoPath), eq(analysisCache.scope, scope))
    : eq(analysisCache.repoPath, repoPath);

  const deleted = db.delete(analysisCache).where(conditions).run();

  return NextResponse.json({ deleted: deleted.changes });
}
