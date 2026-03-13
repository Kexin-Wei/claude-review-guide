import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const analysisCache = sqliteTable("analysis_cache", {
  id: text("id").primaryKey(),
  repoPath: text("repo_path").notNull(),
  diffHash: text("diff_hash").notNull(),
  scope: text("scope").notNull(),
  result: text("result").notNull(),
  rawDiff: text("raw_diff").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const reviewState = sqliteTable("review_state", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id")
    .notNull()
    .references(() => analysisCache.id),
  reviewedFiles: text("reviewed_files").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
