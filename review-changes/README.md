# review-changes

A Claude Code plugin that semantically groups git changes by purpose and provides AI-annotated code review.

## What It Does

Instead of reviewing a flat list of changed files, `review-changes` uses AI to:

1. **Group changes by purpose** — A refactored utility, a new feature, and a bug fix in the same diff get separated into distinct reviewable units, even if they touch the same files.
2. **Let you pick what to review** — Choose which feature group to focus on, review it, then move to the next.
3. **Annotate diffs with context** — Each file gets annotations explaining *what* changed, *why* it matters, and *what to watch for* during review.

## Installation

### Option A: Plugin directory

```bash
claude --plugin-dir /path/to/review-changes
```

### Option B: Plugin install

```bash
claude plugin install /path/to/review-changes
```

## Usage

```
/review-changes                     # All uncommitted changes (staged + unstaged)
/review-changes staged              # Only staged changes
/review-changes unstaged            # Only unstaged changes
/review-changes branch              # Current branch vs main/master
/review-changes commit abc123       # Changes from a specific commit
/review-changes main..feature       # Changes between two refs
```

### Workflow

1. Run the command with your desired scope
2. The plugin analyzes the diff and groups changes by purpose
3. Pick a feature group to review (or review all changes at once)
4. Read through annotated diffs with insights on each file
5. Review another feature or finish

## How It Differs

| Approach | Limitation |
|----------|-----------|
| `git diff` | Raw diff — no grouping, no context |
| GitHub PR review | File-by-file, not purpose-by-purpose |
| AI "review my code" | Dumps everything at once, no structure |
| **review-changes** | Groups by intent, interactive selection, annotated per-file |

## Architecture

- **`commands/review-changes.md`** — The slash command orchestrator. Handles argument parsing, user interaction, and annotated diff display.
- **`agents/diff-analyzer.md`** — A Sonnet-powered subagent that groups diff hunks by semantic purpose.
- **`.claude-plugin/plugin.json`** — Plugin manifest for Claude Code discovery.

No build steps. No npm packages. No external dependencies. Pure markdown + JSON.

## License

MIT
