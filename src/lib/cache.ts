import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/db";
import { analysisCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { FeatureGroup } from "@/types";

export function hashDiff(diff: string): string {
  return createHash("sha256").update(diff).digest("hex");
}

export async function getCachedAnalysis(
  diffHash: string
): Promise<{ id: string; groups: FeatureGroup[]; rawDiff: string; createdAt: Date } | null> {
  const rows = db
    .select()
    .from(analysisCache)
    .where(eq(analysisCache.diffHash, diffHash))
    .limit(1)
    .all();

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    id: row.id,
    groups: JSON.parse(row.result),
    rawDiff: row.rawDiff,
    createdAt: row.createdAt,
  };
}

export async function saveAnalysis(
  repoPath: string,
  diffHash: string,
  scope: string,
  groups: FeatureGroup[],
  rawDiff: string
): Promise<string> {
  const id = uuidv4();
  db.insert(analysisCache)
    .values({
      id,
      repoPath,
      diffHash,
      scope,
      result: JSON.stringify(groups),
      rawDiff,
      createdAt: new Date(),
    })
    .run();
  return id;
}
