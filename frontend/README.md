# Code Review

AI-powered semantic code review tool. Groups git diffs by purpose and provides annotated analysis using Claude. Includes full repository architecture analysis.

## What It Does

### Code Analysis (Default Tab)

Scans the entire repository and uses Claude to:

1. **Group files by architectural role** — Core Features, Data Layer, UI/Components, API/Routes, Configuration, Utilities, etc.
2. **Lead with Architecture** — the first group is always an architecture overview of project structure and design decisions
3. **Annotate each file** with three-part analysis:
   - **Purpose** — what the file does
   - **Significance** — why it matters in the architecture
   - **Key Notes** — important details for reviewers

### Diff Analysis (Git Changes / Commit Analysis Tabs)

Instead of reviewing diffs file-by-file, this tool uses Claude to:

1. **Group changes by purpose** — bug fixes, new features, refactors, etc. are separated into distinct reviewable units, even when they touch the same files
2. **Annotate each file** with three-part analysis:
   - **What changed** — factual summary of modifications
   - **Why it matters** — purpose and impact in context
   - **Review hint** — what reviewers should watch for
3. **Cache results** in SQLite so identical diffs aren't re-analyzed

## Layout

**Code Analysis** — Two-column layout:
- **Left** — Semantic architecture groups (Architecture first, then features)
- **Right** — File cards with side-by-side annotations (Purpose + Significance | Key Notes)

**Git Changes / Commit Analysis** — Three-column layout with resizable panels:
- **Left** — Semantic feature groups with review progress checkboxes
- **Middle** — Syntax-highlighted unified diff view
- **Right** — AI annotations aligned to corresponding code

## Supported Scopes

| Tab | Scope | Git Command |
|-----|-------|------------|
| Git Changes | All uncommitted | `git diff HEAD` |
| Git Changes | Staged only | `git diff --cached` |
| Git Changes | Unstaged only | `git diff` |
| Git Changes | Branch diff | `git diff $(git merge-base HEAD main)..HEAD` |
| Commit Analysis | Single commit | `git show <ref>` |
| Commit Analysis | Commit range | `git diff <from>..<to>` |

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000, enter a local git repo path, then click **Analyze**.

**Authentication:** Uses the logged-in Claude Code subscription — no API key needed. The backend spawns the `claude` CLI subprocess which authenticates via your existing Claude Code session.

## Stack

- Next.js 14+ (App Router) / TypeScript / Tailwind CSS
- SQLite via Drizzle ORM + better-sqlite3
- Claude CLI subprocess (`claude -p`) for AI integration (uses Claude Code subscription auth)

## CLI Plugin

The original CLI plugin for Claude Code is preserved on the `claude-plugin` branch.
