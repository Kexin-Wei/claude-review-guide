import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { analysisCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { FeatureGroup, UmlModule } from "@/types";

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function getCachedAnalysis(
  diffHash: string
): Promise<{ id: string; groups: FeatureGroup[]; rawDiff: string; createdAt: Date; umlStructure?: UmlModule[] } | null> {
  const rows = db
    .select()
    .from(analysisCache)
    .where(eq(analysisCache.diffHash, diffHash))
    .limit(1)
    .all();

  if (rows.length === 0) return null;

  const row = rows[0];
  const parsed = JSON.parse(row.result);
  // Support both old format (array) and new format ({ groups, umlStructure })
  const groups = Array.isArray(parsed) ? parsed : parsed.groups;
  const umlStructure = Array.isArray(parsed) ? undefined : parsed.umlStructure;
  return {
    id: row.id,
    groups,
    rawDiff: row.rawDiff,
    createdAt: row.createdAt,
    umlStructure,
  };
}

export async function saveAnalysis(
  repoPath: string,
  diffHash: string,
  scope: string,
  groups: FeatureGroup[],
  rawDiff: string,
  umlStructure?: UmlModule[]
): Promise<string> {
  const id = uuidv4();
  const result = umlStructure
    ? JSON.stringify({ groups, umlStructure })
    : JSON.stringify(groups);
  db.insert(analysisCache)
    .values({
      id,
      repoPath,
      diffHash,
      scope,
      result,
      rawDiff,
      createdAt: new Date(),
    })
    .run();
  return id;
}
