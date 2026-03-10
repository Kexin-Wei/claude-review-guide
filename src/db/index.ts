import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DB_DIR, "code-review.db");

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS analysis_cache (
    id TEXT PRIMARY KEY,
    repo_path TEXT NOT NULL,
    diff_hash TEXT NOT NULL,
    scope TEXT NOT NULL,
    result TEXT NOT NULL,
    raw_diff TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS review_state (
    id TEXT PRIMARY KEY,
    analysis_id TEXT NOT NULL REFERENCES analysis_cache(id),
    reviewed_files TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

export const db = drizzle(sqlite, { schema });
