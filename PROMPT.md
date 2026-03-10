# Prompt: Build a Web-Based Semantic Code Review Tool

You are building a **web-based code review tool** that semantically groups git diffs by purpose and provides AI-powered annotations. It replaces a CLI plugin that was limited by terminal UX — the web version should be visual, persistent, and easy to navigate.

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

The web app preserves all of this logic but provides a **three-column visual layout** instead of sequential terminal output, and **persists results** in SQLite so analysis isn't repeated.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| UI | React, Tailwind CSS |
| Database | SQLite via Drizzle ORM + `better-sqlite3` |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) |
| Syntax Highlighting | Shiki |
| Package Manager | npm |

Single Next.js project — no separate backend service.

---

## Application Layout

The app is a **single-page application** with this structure:

```
┌──────────────────────────────────────────────────────────────────┐
│  [Repo Path: /home/user/project ✓]  [API Key: ••••••]  [⚙]    │  ← Top Bar
├──────────────────────────────────────────────────────────────────┤
│  [ Git Changes ]  [ Commit Analysis ]  [ Code Analysis ]        │  ← Tab Bar
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

### Tab 1: Git Changes

Analyzes uncommitted changes in a git repository.

**Scope selector** (dropdown):
| Option | Git Command |
|--------|------------|
| All uncommitted (default) | `git diff HEAD` |
| Staged only | `git diff --cached` |
| Unstaged only | `git diff` |
| Branch diff | `git diff $(git merge-base HEAD <main\|master>)..HEAD` |

### Tab 2: Commit Analysis

Analyzes specific commits or commit ranges.

**Input fields:**
- **Single commit** — text input for a commit ref → `git show <ref> --format=""`
- **Commit range** — two inputs (from, to) → `git diff <ref1>..<ref2>`
- **Recent commits** — clickable list from `git log --oneline -10`

### Tab 3: Code Analysis

Full codebase structural analysis (not diff-based).

**Scope selector:**
- Entire repo (with configurable ignore patterns: `node_modules`, `.git`, `dist`)
- Specific directory or file glob

**Analysis types** (checkboxes, multi-select):
- Complexity hotspots
- Code patterns and conventions
- Architecture / dependency structure
- Potential issues (dead code, unused exports)

This tab uses the middle column for **source code** (not diffs) and the right column for **structural insights** instead of per-hunk annotations.

---

## Three-Column Layout

All three columns fill the viewport height below the scope bar. Columns are **resizable** via draggable dividers. Default widths: **25% / 40% / 35%**. Minimum width per column: 15%.

### Left Column: Feature / File Selector

After analysis, this shows **semantic feature groups** — changes grouped by purpose, not by file.

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
- A file may appear in **multiple groups** if different hunks serve different purposes
- Groups are ordered by significance (most impactful first)
- An **"All changes"** group is always present at the bottom
- A **progress indicator** shows "3/7 files reviewed"

**Semantic categories** for grouping (not exhaustive — the AI determines categories from context):
- Bug fix
- New feature
- Refactor / code cleanup
- Configuration change
- Test additions/modifications
- Dependency updates
- Documentation
- Performance improvement
- Security fix
- Style / formatting

**Group title convention:** Imperative tense, under 60 characters (e.g., "Fix timezone bug in date formatter", not "Fixed" or "Fixing").

### Middle Column: Diff / Source View

Full syntax highlighting via Shiki.

**For Git Changes and Commit Analysis tabs:**
- Unified diff format with `+`/`-` line coloring (green additions, red deletions)
- File headers separating each file's diff:
  ```
  ── src/utils/date.ts ──────────────────────────
  ```
- Line numbers on both sides (old and new)
- Collapsed unchanged context with "Show N more lines" expanders
- Copy button per hunk

**For Code Analysis tab:**
- Full source files with syntax highlighting
- Regions of interest highlighted with subtle background coloring

### Right Column: AI Annotations

Claude's analysis, aligned to corresponding code in the middle column.

**For Git Changes and Commit Analysis tabs**, each file gets:

```
┌─────────────────────────────────────┐
│ ✦ What changed                      │
│   Replaced native getTimezoneOffset │
│   with timezone-aware helper that   │
│   accepts target timezone string.   │
│                                     │
│ ✦ Why it matters                    │
│   getTimezoneOffset() ignores the   │
│   target timezone — root cause of   │
│   dates shifting by hours.          │
│                                     │
│ ✦ Review hint                       │
│   Verify getTimezoneOffset handles  │
│   DST transitions correctly.        │
└─────────────────────────────────────┘
```

**For Code Analysis tab**, annotations are structural insights: complexity scores, pattern observations, dependency relationships, suggested improvements.

### Synchronized Scrolling

The middle and right columns **scroll together**. When the user scrolls diffs, annotations stay aligned with their corresponding hunks.

**Implementation approach:**
1. Each diff hunk in the middle column has a `data-file-id` attribute
2. Each annotation card in the right column has a matching `data-file-id`
3. On scroll, find the topmost visible `data-file-id` and scroll the other column to match
4. Debounce at 16ms, use `scrollIntoView({ behavior: "smooth", block: "start" })`
5. Prevent infinite loops by disabling the other column's listener during programmatic scrolls
6. A **lock icon** in the right column header toggles sync on/off

### Search Bar

A search bar spans the middle + right columns. It:
- Filters/highlights matches in both diff content and AI annotations
- Shows match count ("12 matches")
- Has prev/next navigation (↑/↓ or Enter/Shift+Enter)
- Supports a regex toggle button

---

## API Routes

### `POST /api/analyze`

Main analysis endpoint.

**Request body:**
```typescript
{
  repoPath: string;
  scope: "all" | "staged" | "unstaged" | "branch" | "commit" | "range";
  commitRef?: string;
  fromRef?: string;
  toRef?: string;
  apiKey: string;
}
```

**Processing:**
1. Validate `repoPath` is a git repo (`git rev-parse --is-inside-work-tree`)
2. Run the appropriate git command based on scope
3. If diff is empty → return `{ groups: [], diff: "", message: "No changes found" }`
4. Hash the diff (SHA-256) and check SQLite cache
5. If cache hit → return cached result with `cached: true`
6. Send diff to Claude for semantic grouping
7. Parse Claude's JSON response into feature groups
8. Store in SQLite cache
9. Return result

**Response:**
```typescript
{
  groups: FeatureGroup[];
  rawDiff: string;
  analyzedAt: string;   // ISO timestamp
  cached: boolean;
}

interface FeatureGroup {
  id: string;           // Generated UUID
  title: string;        // Imperative, <60 chars
  summary: string;      // One sentence
  category: string;     // "bug-fix", "feature", "refactor", etc.
  significance: number; // 1-10, for ordering
  files: FileChange[];
}

interface FileChange {
  path: string;
  lineRange?: string;   // e.g. "12-18"
  description: string;
  diff: string;         // Relevant diff hunks for this file in this group
  annotations: {
    whatChanged: string;
    whyItMatters: string;
    reviewHint: string;
  };
}
```

### `POST /api/analyze-codebase`

For the Code Analysis tab. Sends file contents (not diffs) and requests structural analysis. Same caching pattern.

### `GET /api/repo/validate?path=<path>`

Returns `{ valid: boolean, branch: string, remoteUrl?: string }`.

### `GET /api/repo/commits?path=<path>&count=10`

Returns `{ commits: { hash: string, message: string, author: string, date: string }[] }`.

---

## Claude API Integration

### Semantic Grouping Prompt

System prompt for the grouping call:

```
You are a semantic diff analyzer. You receive a git diff and group the changes
by PURPOSE — not by file. A single file may appear in multiple groups if
different hunks serve different purposes.

Rules:
- Group titles: imperative tense, under 60 characters
- Order groups by significance (most impactful first)
- Always include an "All changes" group at the end listing every file
- For very large diffs (50+ files), limit to 8 purpose groups + "All changes"
- Merge minor/trivial groups together
- For each file in each group, provide three annotations:
  1. What changed — factual summary of modifications
  2. Why it matters — purpose and impact
  3. Review hint — what reviewers should watch for

Respond in JSON matching this exact schema:
{
  "groups": [
    {
      "title": "Fix timezone bug in date formatter",
      "summary": "Replaces naive timezone offset with timezone-aware helper",
      "category": "bug-fix",
      "significance": 9,
      "files": [
        {
          "path": "src/utils/date.ts",
          "lineRange": "12-18",
          "description": "Swapped getTimezoneOffset for tz-aware helper",
          "annotations": {
            "whatChanged": "...",
            "whyItMatters": "...",
            "reviewHint": "..."
          }
        }
      ]
    }
  ]
}
```

### Model Selection

- Default: `claude-sonnet-4-6` (fast, cost-effective for most diffs)
- Deep analysis toggle: `claude-opus-4-6` (for complex or large changes)

### API Call

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey });

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 8192,
  system: SEMANTIC_GROUPING_SYSTEM_PROMPT,
  messages: [
    {
      role: "user",
      content: `Analyze the following git diff and group changes by semantic purpose.\n\n<diff>\n${diff}\n</diff>`,
    },
  ],
});
```

For diffs exceeding **100KB**, split into chunks by file, analyze in parallel, then merge groups.

---

## SQLite Schema (Drizzle ORM)

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const analysisCache = sqliteTable("analysis_cache", {
  id: text("id").primaryKey(),
  repoPath: text("repo_path").notNull(),
  diffHash: text("diff_hash").notNull(),     // SHA-256 of raw diff
  scope: text("scope").notNull(),
  result: text("result").notNull(),          // JSON stringified FeatureGroup[]
  rawDiff: text("raw_diff").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const reviewState = sqliteTable("review_state", {
  id: text("id").primaryKey(),
  analysisId: text("analysis_id").notNull().references(() => analysisCache.id),
  reviewedFiles: text("reviewed_files").notNull(),  // JSON array of file paths
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

Cache key: SHA-256 hash of raw diff content. Same diff for same repo → return cached result.

---

## Component Hierarchy

```
<App>
  <TopBar>
    <RepoPathInput />          // With ✓/✗ validation indicator
    <ApiKeyInput />            // Masked, stored in localStorage
    <SettingsButton />         // Dark mode toggle, clear cache, etc.
  </TopBar>
  <TabBar>
    <Tab label="Git Changes" />
    <Tab label="Commit Analysis" />
    <Tab label="Code Analysis" />
  </TabBar>
  <ScopeSelector />            // Changes per active tab
  <AnalyzeButton />            // With loading spinner
  <ThreeColumnLayout>
    <LeftColumn>
      <ReviewProgress />       // "3/7 files reviewed"
      <FeatureGroupList>
        <FeatureGroupCard />   // Collapsible, checkboxes
      </FeatureGroupList>
    </LeftColumn>
    <ColumnResizer />
    <MiddleColumn>
      <SearchBar />            // Spans middle + right
      <DiffView />             // Or SourceView for Code Analysis
    </MiddleColumn>
    <ColumnResizer />
    <RightColumn>
      <ScrollSyncToggle />     // Lock icon
      <AnnotationList>
        <AnnotationCard />     // What changed / Why / Review hint
      </AnnotationList>
    </RightColumn>
  </ThreeColumnLayout>
</App>
```

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        // Main SPA
│   ├── globals.css
│   └── api/
│       ├── analyze/route.ts            // POST — diff analysis
│       ├── analyze-codebase/route.ts   // POST — code analysis
│       └── repo/
│           ├── validate/route.ts       // GET — validate git repo
│           └── commits/route.ts        // GET — recent commits
├── components/
│   ├── TopBar.tsx
│   ├── TabBar.tsx
│   ├── ScopeSelector.tsx
│   ├── ThreeColumnLayout.tsx
│   ├── FeatureGroupCard.tsx
│   ├── DiffView.tsx
│   ├── AnnotationCard.tsx
│   ├── SearchBar.tsx
│   ├── ColumnResizer.tsx
│   └── ScrollSyncToggle.tsx
├── lib/
│   ├── git.ts                          // Git command helpers (execFile)
│   ├── claude.ts                       // Anthropic SDK wrapper
│   ├── cache.ts                        // SQLite cache operations
│   └── diff-parser.ts                  // Parse unified diff → structured format
├── db/
│   ├── schema.ts                       // Drizzle schema
│   └── index.ts                        // DB connection
├── types/
│   └── index.ts                        // Shared TypeScript interfaces
└── hooks/
    ├── useScrollSync.ts
    ├── useResizableColumns.ts
    └── useAnalysis.ts                  // Data fetching hook for analysis
```

---

## Security

- **API key:** Never log or persist server-side. Passed per-request from the client (stored in localStorage). Shown masked in the UI.
- **Git commands:** Always use `execFile` (not `exec`) to prevent shell injection. Validate `repoPath` is an absolute path that exists and contains `.git` before running any commands.
- **Input sanitization:** Commit refs are validated against `^[a-zA-Z0-9._/~^-]+$` before use in git commands.

---

## UX Details

- **Dark mode:** System-preference detection via Tailwind `dark:` variants. Manual toggle in settings. Shiki themes: `github-dark` / `github-light`.
- **Loading states:** Skeleton/shimmer in the right column while Claude analyzes. Progress bar on the Analyze button.
- **Empty states:** Friendly messages for no changes, no repo, invalid key.
- **Error handling:** Toast notifications for API errors with retry button. Don't clear previous results on error.
- **Large diff warning:** If diff exceeds 50 files, show confirmation: "Large diff detected (N files). Analysis may take longer and cost more."
- **Responsive:** Below 768px, the three-column layout collapses to a tabbed single-column view.
- **Keyboard navigation:** All interactive elements accessible via keyboard. ARIA labels on custom components.
- **Persist column widths** in localStorage.

---

## Getting Started

```bash
npx create-next-app@latest code-review --typescript --tailwind --app --src-dir
cd code-review
npm install @anthropic-ai/sdk drizzle-orm better-sqlite3 shiki
npm install -D drizzle-kit @types/better-sqlite3
```

Then implement the file structure above, starting with:
1. Database schema and connection (`db/`)
2. Git command helpers (`lib/git.ts`)
3. API routes (`app/api/`)
4. Core UI layout (`components/ThreeColumnLayout.tsx`, `ColumnResizer.tsx`)
5. Feature group cards and diff view
6. Claude integration and annotation rendering
7. Search, scroll sync, and polish
