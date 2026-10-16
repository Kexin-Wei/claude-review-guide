# Claude Review Guide

A local web app for AI-assisted code review. It uses Claude to group git changes by **purpose** instead of by file, annotates each change, and generates an architecture overview of a whole repository.

## Features

- **Code Analysis** — scans the full repo, draws a module/layer UML diagram and class diagram, and groups files by architectural role (Architecture first). Each file gets *Purpose*, *Significance* and *Key Notes*, down to individual functions/classes.
- **Git Changes** — semantic diff review of uncommitted, staged, unstaged, or branch changes. Hunks are grouped into reviewable units (bug fix, feature, refactor…), and one file can appear in several groups.
- **Commit Analysis** — the same view for a single commit or a commit range.
- **Annotated diffs** — three-column layout: feature groups with review checkboxes, syntax-highlighted diff, and per-file *What changed / Why it matters / Review hint*.
- **Caching** — results are stored in SQLite, so an unchanged diff is not re-analyzed. Each tab has a clear-cache button.

| Tab | Scope | Git command |
|-----|-------|-------------|
| Git Changes | All uncommitted | `git diff HEAD` |
| Git Changes | Staged | `git diff --cached` |
| Git Changes | Unstaged | `git diff` |
| Git Changes | Branch | `git diff $(git merge-base HEAD main)..HEAD` |
| Commit Analysis | Single commit | `git show <ref>` |
| Commit Analysis | Range | `git diff <from>..<to>` |

## Architecture

```
frontend/  Next.js (App Router) + React + Tailwind + Shiki   :3000
   │  /api/* routes proxy to the backend (BACKEND_URL)
   ▼
backend/   FastAPI + Claude Agent SDK                         :8000
   ├─ agents/   orchestrator, code_analyzer, uml_analyzer
   ├─ routes/   analyze, analyze-repo, repo, cache
   └─ services/ git, repo_scanner, cache (SQLite at .data/)
```

The backend runs Claude through the [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview), which reuses your logged-in Claude Code session — no API key is required.

## Requirements

- Node.js 20+
- Python 3.11+ and [uv](https://docs.astral.sh/uv/)
- [Claude Code](https://docs.claude.com/en/docs/claude-code) installed and logged in

## Getting started

```bash
git clone https://github.com/Kexin-Wei/claude-review-guide.git
cd claude-review-guide
npm run install:all   # frontend npm deps + backend .venv
npm run dev           # starts frontend (:3000) and backend (:8000)
```

Open http://localhost:3000, enter the path to a local git repository, pick a tab and scope, then click **Analyze**.

To run the two halves separately: `npm run dev:frontend` and `npm run dev:backend`. Set `BACKEND_URL` if the backend is not on `http://localhost:8000`.

## History

This started as a Claude Code CLI plugin (`review-changes`); that version is kept on the [`claude-plugin`](https://github.com/Kexin-Wei/claude-review-guide/tree/claude-plugin) branch. See [`frontend/PROMPT.md`](frontend/PROMPT.md) for the original design spec.
