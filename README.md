# Code Review

AI-powered semantic code review tool. Groups git diffs by purpose and provides annotated analysis using Claude.

## What It Does

Instead of reviewing diffs file-by-file, this tool uses Claude to:

1. **Group changes by purpose** — bug fixes, new features, refactors, etc. are separated into distinct reviewable units, even when they touch the same files
2. **Annotate each file** with three-part analysis:
   - **What changed** — factual summary of modifications
   - **Why it matters** — purpose and impact in context
   - **Review hint** — what reviewers should watch for
3. **Cache results** in SQLite so identical diffs aren't re-analyzed

## Layout

Three-column interface with resizable panels:

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

Open http://localhost:3000, enter a local git repo path and your [Anthropic API key](https://console.anthropic.com/), then click **Analyze**.

## Stack

- Next.js 14+ (App Router) / TypeScript / Tailwind CSS
- SQLite via Drizzle ORM + better-sqlite3
- Anthropic SDK for Claude integration

## CLI Plugin

The original CLI plugin for Claude Code is preserved on the `claude-plugin` branch.
