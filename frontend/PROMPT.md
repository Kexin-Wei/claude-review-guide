# Prompt: Build a Web-Based Semantic Code Review Tool

You are building a **web-based code review tool** that semantically groups git diffs by purpose and provides AI-powered annotations. It also performs full repository architecture analysis. It replaces a CLI plugin that was limited by terminal UX — the web version should be visual, persistent, and easy to navigate.

---

## Background: What This Replaces

The existing CLI plugin (`review-changes`) works inside Claude Code. It:
- Runs `git diff` and sends the output to a Claude subagent
- The subagent groups changes by **semantic purpose** (bug fix, new feature, refactor, etc.) — not by file path
- A single file can appear in multiple groups if different hunks serve different purposes
- The user selects a feature group, then sees annotated diffs with three-part annotations:
  - **What changed** — factual summary of modifications
  - **Why it matters** — purpose and impact in context
  - **Review hint** — what reviewers should watch for

The web app preserves all of this logic, adds **full repository architecture analysis**, and provides a **visual multi-column layout** instead of sequential terminal output with **persistent results** in SQLite.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| UI | React, Tailwind CSS |
| Database | SQLite via Drizzle ORM + `better-sqlite3` |
| AI | Claude CLI subprocess (`claude -p`) — uses Claude Code subscription auth |
| Syntax Highlighting | Shiki |
| Package Manager | npm |

Single Next.js project — no separate backend service. No API key required — the backend spawns the `claude` CLI which authenticates via the user's existing Claude Code session.

---

## Application Layout

The app is a **single-page application** with two layout modes:

### Code Analysis (Two-Column)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Repo Path: /home/user/project ✓]  [main branch]              │  ← Top Bar
├──────────────────────────────────────────────────────────────────┤
│  [★ Code Analysis]  [ Git Changes ]  [ Commit Analysis ]        │  ← Tab Bar
├──────────────────────────────────────────────────────────────────┤
│  Full repo architecture analysis                  [▶ Analyze]   │  ← Scope Bar
├──────────────────┬───────────────────────────────────────────────┤
│                  │  [🔍 Search across files and annotations...] │
│  Architecture    ├───────────────────────────────────────────────┤
│  Groups          │                                               │
│                  │  ┌─ src/lib/claude.ts ──────────────────────┐ │
│  ★ Architecture  │  │ Claude CLI integration                   │ │
│    (8 files)     │  │                                          │ │
│                  │  │ Purpose         │ Key Notes              │ │
│  ★ Core Features │  │ Spawns claude   │ Uses stdin piping for  │ │
│    (5 files)     │  │ subprocess for  │ large prompts, robust  │ │
│                  │  │ AI analysis     │ JSON extraction...     │ │
│  ★ API/Routes    │  └────────────────────────────────────────────┘ │
│    (4 files)     │                                               │
│                  │  ┌─ src/lib/git.ts ─────────────────────────┐ │
│  12 files        │  │ Git command helpers                      │ │
│  analyzed        │  │ ...                                      │ │
│                  │  └────────────────────────────────────────────┘ │
├──────────────────┴───────────────────────────────────────────────┤
└──────────────────────────────────────────────────────────────────┘
```

### Git Changes / Commit Analysis (Three-Column)

```
┌──────────────────────────────────────────────────────────────────┐
│  [Repo Path: /home/user/project ✓]  [main branch]              │  ← Top Bar
├──────────────────────────────────────────────────────────────────┤
│  [ Code Analysis ]  [★ Git Changes]  [ Commit Analysis ]        │  ← Tab Bar
├──────────────────────────────────────────────────────────────────┤
│  Scope: [All uncommitted ▾]                      [▶ Analyze]    │  ← Scope Bar
├──────────────┬───────────────────────┬───────────────────────────┤
│              │  [🔍 Search across diff and annotations...]       │
│  Feature     ├───────────────────────┬───────────────────────────┤
│  Groups      │                       │                           │
│              │   Diff / Source       │   AI Annotations          │
│  ☐ Fix tz    │   View               │                           │
│    bug (2)   │                       │   ✦ What changed          │
│              │   - old line          │   ...                     │
│  ☐ Add rate  │   + new line          │   ✦ Why it matters        │
│    limit (3) │                       │   ...                     │
│              │                       │   ✦ Review hint           │
│  3/7 done    │                       │   ...                     │
│              │                       │                           │
├──────────────┴───────────────────────┴───────────────────────────┤
│  25% ◂═══════╋═══════════════════╋═══════════════════▸ 35%      │  ← Resizable
└──────────────────────────────────────────────────────────────────┘
```

---

## Tab Types

### Tab 1: Code Analysis (Default)

Full repository architecture analysis. Scans the repo using `git ls-files` and sends a snapshot (file tree, config files, source samples) to Claude.

**Analysis approach:**
- Uses `git ls-files` for tracked file listing
- Reads key config files (package.json, tsconfig.json, etc.)
- Samples source files prioritizing entry points (index, main, app, page, route, layout)
- Claude groups files by architectural role

**Groups:**
- **Architecture** (always first) — overall project structure and design decisions
- Additional groups: Core Features, Data Layer, UI/Components, Configuration, API/Routes, Utilities, etc.
- Limited to 6-8 groups, ordered by architectural significance

**Layout:** Two-column — groups sidebar on left, file cards with side-by-side annotations on right. Each file card shows:
- File path and description in the header
- Left side: Purpose + Significance
- Right side: Key Notes
- Visual separation via `divide-x`

### Tab 2: Git Changes

Analyzes uncommitted changes in a git repository.

**Scope selector** (dropdown):
| Option | Git Command |
|--------|------------|
| All uncommitted (default) | `git diff HEAD` |
| Staged only | `git diff --cached` |
| Unstaged only | `git diff` |
| Branch diff | `git diff $(git merge-base HEAD <main\|master>)..HEAD` |

### Tab 3: Commit Analysis

Analyzes specific commits or commit ranges.

**Input fields:**
- **Single commit** — text input for a commit ref → `git show <ref> --format=""`
- **Commit range** — two inputs (from, to) → `git diff <ref1>..<ref2>`
- **Recent commits** — clickable list from `git log --oneline -10`

---

## Tab Switching Behavior

- Switching tabs **does not abort running analyses** — they continue in the background
- Each tab type caches its last result using `useRef` (not state, to avoid re-renders)
- `showDiffResult()` and `showRepoResult()` restore cached results when switching tabs
- Search query and selected group reset on tab switch

---

## Layout Details

### Left Column: Feature / File Selector

After analysis, this shows **semantic groups** — changes grouped by purpose (diff tabs) or architectural role (code analysis tab).

Each group is a collapsible card:
```
┌─────────────────────────────────────┐
│ ☐  Fix timezone bug in formatter    │
│     3 files · Bug fix               │
│                                     │
│   ☐ src/utils/date.ts (L12-18)     │
│   ☐ src/utils/tz.ts (L4-9)         │
│   ☐ tests/date.test.ts (L22-40)    │
└─────────────────────────────────────┘
```

**Behavior:**
- Clicking a **group header** selects all files and scrolls the middle column to the first file's diff
- Clicking a **file** scrolls to that specific file's diff in the middle column
- Checkboxes mark items as "reviewed" (visual only — green checkmark, strikethrough style)
- Groups are ordered by significance (most impactful first)
- An **"All changes"** group is always present at the bottom (diff tabs only)
- Progress indicator: "3/7 files reviewed" (diff tabs) or "12 files analyzed" (code analysis)

**Semantic categories** with color coding:
- Bug fix, New feature, Refactor / code cleanup
- Architecture, Data Layer, API, UI, Utility
- Configuration change, Test, Dependency updates
- Documentation, Performance, Security fix

**Group title convention:** Imperative tense, under 60 characters.

### Middle Column: Diff View (Three-Column Mode Only)

Full syntax highlighting via Shiki.

- Unified diff format with `+`/`-` line coloring (green additions, red deletions)
- File headers separating each file's diff
- Line numbers on both sides (old and new)

### Right Column: AI Annotations (Three-Column Mode Only)

Claude's analysis, aligned to corresponding code in the middle column.

Each file gets:
```
┌─────────────────────────────────────┐
│ ✦ What changed                      │
│   Replaced native getTimezoneOffset │
│   with timezone-aware helper.       │
│                                     │
│ ✦ Why it matters                    │
│   getTimezoneOffset() ignores the   │
│   target timezone — root cause.     │
│                                     │
│ ✦ Review hint                       │
│   Verify DST transition handling.   │
└─────────────────────────────────────┘
```

### Combined Right Panel: File Cards (Two-Column Mode — Code Analysis)

Each file is a `RepoFileCard` with side-by-side layout:
```
┌─ src/lib/claude.ts ──────────────────────────────────────┐
│ Claude CLI integration for AI analysis                    │
├──────────────────────────┬───────────────────────────────┤
│ Purpose                  │ Key Notes                     │
│ Spawns claude subprocess │ Uses stdin piping for large   │
│ for AI-powered analysis  │ prompts, robust JSON          │
│                          │ extraction with brace-        │
│ Significance             │ matching parser. CLAUDECODE   │
│ Core backend logic that  │ env var bypasses nested       │
│ connects to Claude via   │ session detection.            │
│ subscription auth        │                               │
└──────────────────────────┴───────────────────────────────┘
```

### Synchronized Scrolling (Three-Column Mode)

The middle and right columns **scroll together**. When the user scrolls diffs, annotations stay aligned.

**Implementation:**
1. Each diff hunk has a `data-file-id` attribute
2. Each annotation card has a matching `data-file-id`
3. On scroll, find the topmost visible `data-file-id` and scroll the other column to match
4. Debounce at 16ms, use `scrollIntoView({ behavior: "smooth", block: "start" })`
5. A **toggle** in the right column header enables/disables sync

### Search Bar

A search bar at the top of the content area:
- Filters/highlights matches in both diff content and AI annotations
- Shows match count

---

## API Routes

### `POST /api/analyze`

Diff analysis endpoint (Git Changes and Commit Analysis tabs).

**Request body:**
```typescript
{
  repoPath: string;
  scope: "all" | "staged" | "unstaged" | "branch" | "commit" | "range";
  commitRef?: string;
  fromRef?: string;
  toRef?: string;
}
```

**Processing:**
1. Validate `repoPath` is a git repo (`git rev-parse --is-inside-work-tree`)
2. Run the appropriate git command based on scope
3. If diff is empty → return `{ groups: [], diff: "", message: "No changes found" }`
4. Hash the diff (SHA-256) and check SQLite cache
5. If cache hit → return cached result with `cached: true`
6. Send diff to Claude CLI for semantic grouping
7. Parse Claude's JSON response into feature groups
8. Store in SQLite cache
9. Return result with `type: "diff"`

### `POST /api/analyze-repo`

Repository architecture analysis endpoint (Code Analysis tab).

**Request body:**
```typescript
{
  repoPath: string;
}
```

**Processing:**
1. Validate `repoPath` is a git repo
2. Scan repo using `git ls-files`, read key config files, sample source files
3. Hash the snapshot and check SQLite cache
4. If cache hit → return cached result with `cached: true`
5. Send snapshot to Claude CLI for architecture analysis
6. Parse JSON response into architecture groups
7. Store in SQLite cache
8. Return result with `type: "repo"` and `fileTree`

### `GET /api/repo/validate?path=<path>`

Returns `{ valid: boolean, branch: string }`.

### `GET /api/repo/commits?path=<path>&count=10`

Returns `{ commits: { hash: string, message: string, author: string, date: string }[] }`.

---

## Response Types

```typescript
{
  type: "diff" | "repo";
  groups: FeatureGroup[];
  rawDiff: string;          // empty for repo analysis
  fileTree?: string[];      // only for repo analysis
  analyzedAt: string;       // ISO timestamp
  cached: boolean;
}

interface FeatureGroup {
  id: string;           // Generated UUID
  title: string;        // Imperative, <60 chars
  summary: string;      // One sentence
  category: string;     // "bug-fix", "feature", "architecture", etc.
  significance: number; // 1-10, for ordering
  files: FileChange[];
}

interface FileChange {
  path: string;
  lineRange?: string;   // e.g. "12-18"
  description: string;
  diff: string;         // Relevant diff hunks (empty for repo analysis)
  annotations: {
    whatChanged: string;
    whyItMatters: string;
    reviewHint: string;
  };
}
```

---

## Claude CLI Integration

### Authentication

Uses the `claude` CLI subprocess which authenticates via the user's existing Claude Code subscription. No API key needed.

```typescript
import { spawn } from "child_process";

function queryClaudeJson(systemPrompt: string, userMessage: string): Promise<{groups: ...}> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      ["-p", "--debug", "--system-prompt", systemPrompt],
      {
        env: { ...process.env, CLAUDECODE: "" },  // bypass nested session detection
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { /* debug logs streamed to console */ });

    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(`claude exited with code ${code}`));
      // Parse JSON from response (with fallback extraction)
      resolve(parseJsonResponse(stdout));
    });

    // Send prompt via stdin (handles large inputs)
    proc.stdin.write(userMessage);
    proc.stdin.end();
  });
}
```

**Key details:**
- `-p` flag: pipe mode (non-interactive, stdin→stdout)
- `CLAUDECODE: ""`: env var to prevent "nested session" errors
- `--debug`: streams verbose logs to stderr for visibility
- stdin piping: avoids shell argument length limits for large prompts
- Robust JSON extraction: strips markdown fences, tries direct parse, falls back to brace-matching extraction

### Semantic Grouping Prompt (Diff Analysis)

```
You are a semantic diff analyzer that outputs ONLY valid JSON.
You receive a git diff and group the changes by PURPOSE — not by file.

Rules:
- Group titles: imperative tense, under 60 characters
- Order groups by significance (most impactful first)
- Always include an "All changes" group at the end listing every file
- For very large diffs (50+ files), limit to 8 purpose groups + "All changes"
- Merge minor/trivial groups together
- For each file in each group, provide three annotations

OUTPUT FORMAT: Respond with ONLY a JSON object. No explanations, no markdown.
Start your response with { and end with }.
```

### Architecture Prompt (Repo Analysis)

```
You are a repository architecture analyzer that outputs ONLY valid JSON.
You receive a repository snapshot and group files by their architectural role.

Rules:
- The FIRST group MUST be "Architecture" — overall project structure and design
- Additional groups: Core Features, Data Layer, UI/Components, Configuration, etc.
- Only create groups relevant to this specific repo
- Limit to 6-8 groups total, ordered by architectural significance

OUTPUT FORMAT: Respond with ONLY a JSON object. No explanations, no markdown.
Start your response with { and end with }.
```

---

## SQLite Schema (Drizzle ORM)

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const analysisCache = sqliteTable("analysis_cache", {
  id: text("id").primaryKey(),
  repoPath: text("repo_path").notNull(),
  diffHash: text("diff_hash").notNull(),     // SHA-256 of content
  scope: text("scope").notNull(),
  result: text("result").notNull(),          // JSON stringified FeatureGroup[]
  rawDiff: text("raw_diff").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

Cache key: SHA-256 hash of content (diff text or repo snapshot). Same content → return cached result.

---

## Component Hierarchy

```
<App>
  <TopBar>
    <RepoPathInput />          // With ✓/✗ validation indicator + branch name
  </TopBar>
  <TabBar>
    <Tab label="Code Analysis" />    // Default tab
    <Tab label="Git Changes" />
    <Tab label="Commit Analysis" />
  </TabBar>
  <ScopeSelector />            // Changes per active tab
  <StatusMessages />           // Error, info, cache indicators

  {/* Conditional layout based on active tab */}
  {isCodeAnalysis ? (
    <TwoColumnLayout>
      <LeftColumn>
        <ReviewProgress />       // "12 files analyzed"
        <FeatureGroupCard />     // Architecture groups
      </LeftColumn>
      <RightColumn>
        <SearchBar />
        <RepoFileCard />         // Side-by-side file annotations
      </RightColumn>
    </TwoColumnLayout>
  ) : (
    <ThreeColumnLayout>
      <LeftColumn>
        <ReviewProgress />       // "3/7 files reviewed"
        <FeatureGroupCard />     // Semantic purpose groups
      </LeftColumn>
      <ColumnResizer />
      <MiddleColumn>
        <SearchBar />
        <DiffView />
      </MiddleColumn>
      <ColumnResizer />
      <RightColumn>
        <ScrollSyncToggle />
        <AnnotationCard />       // What changed / Why / Review hint
      </RightColumn>
    </ThreeColumnLayout>
  )}
</App>
```

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        // Main SPA (conditional layout)
│   ├── globals.css
│   └── api/
│       ├── analyze/route.ts            // POST — diff analysis
│       ├── analyze-repo/route.ts       // POST — repo architecture analysis
│       └── repo/
│           ├── validate/route.ts       // GET — validate git repo
│           └── commits/route.ts        // GET — recent commits
├── components/
│   ├── TopBar.tsx                      // Repo path + branch display
│   ├── TabBar.tsx                      // Code Analysis | Git Changes | Commit Analysis
│   ├── ScopeSelector.tsx
│   ├── ThreeColumnLayout.tsx           // Resizable three-column (diff tabs)
│   ├── FeatureGroupCard.tsx            // Group card with category colors
│   ├── DiffView.tsx                    // Syntax-highlighted diff
│   ├── AnnotationCard.tsx              // Three-part annotation (diff tabs)
│   ├── RepoFileCard.tsx                // Side-by-side file card (code analysis)
│   ├── SearchBar.tsx
│   └── ScrollSyncToggle.tsx
├── lib/
│   ├── git.ts                          // Git command helpers (execFile)
│   ├── claude.ts                       // Claude CLI subprocess wrapper
│   ├── cache.ts                        // SQLite cache operations
│   ├── repo-scanner.ts                 // Repository snapshot scanner
│   └── diff-parser.ts                  // Parse unified diff → structured format
├── db/
│   ├── schema.ts                       // Drizzle schema
│   └── index.ts                        // DB connection
├── types/
│   └── index.ts                        // Shared TypeScript interfaces
└── hooks/
    ├── useScrollSync.ts                // Middle ↔ right column sync
    ├── useResizableColumns.ts          // Draggable column dividers
    └── useAnalysis.ts                  // Data fetching + per-tab result caching
```

---

## Security

- **Authentication:** No API key in the app. Uses Claude Code subscription auth via CLI subprocess.
- **Git commands:** Always use `execFile` (not `exec`) to prevent shell injection. Validate `repoPath` is an absolute path that exists and contains `.git` before running any commands.
- **Input sanitization:** Commit refs are validated against `^[a-zA-Z0-9._/~^-]+$` before use in git commands.
- **Nested session prevention:** `CLAUDECODE: ""` env var prevents Claude CLI from detecting nested sessions.

---

## UX Details

- **Dark mode:** System-preference detection via Tailwind `dark:` variants.
- **Loading states:** Skeleton/shimmer placeholders while Claude analyzes. Separate loading in left column and content area.
- **Empty states:** Friendly messages for no analysis, no repo path.
- **Error handling:** Error bar with retry button. Don't clear previous results on error.
- **Cached results:** Blue banner showing "Cached result from [timestamp]".
- **Tab switching:** Instant — cached results restore without re-fetching. Running analyses continue in background.
- **Persist column widths** in localStorage (deferred read via useEffect to avoid SSR hydration mismatch).

---

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000, enter a local git repo path, then click **Analyze**.

Requires Claude Code to be installed and logged in (`claude` CLI available in PATH).
