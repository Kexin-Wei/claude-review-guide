# Prompt: Build "review-changes" — A Claude Code Plugin

You are building a Claude Code plugin called `review-changes`. This plugin helps developers review their git changes by grouping them into logical features and presenting annotated diffs for human-guided code review. You will create a complete, working plugin consisting of markdown files and a JSON manifest — no code, no build steps, no npm packages.

<context>
## The gap this plugin fills

There are two approaches to code review in Claude Code today:

1. **Automated AI review** — Plugins like `/code-review` and `/review-pr` have the AI find bugs, style issues, and problems, then report them. The AI is the reviewer.
2. **Manual diff reading** — The developer reads `git diff` output as a flat list of file changes with no grouping or explanation.

**Neither helps the human understand and review their own changes.** This plugin fills that gap:

- It uses AI to **semantically group changes by purpose** (not by file) — a bug fix, a refactoring, and a new feature get separated even if they touch the same files
- It lets the developer **pick which feature to review** via an interactive menu
- It shows **annotated diffs** that explain what changed, why it matters, and what to watch for

The result: faster, more focused code reviews — whether self-review before committing, or walking a teammate through your changes.

## Why a plugin, not a standalone CLI tool

This is a **Claude Code plugin**, not a standalone Node.js CLI. Claude Code already provides everything needed:

| Need | Claude Code provides | Not needed |
|------|---------------------|------------|
| AI analysis | Claude (the model running the plugin) | `@anthropic-ai/sdk` |
| User interaction | `AskUserQuestion` tool | `inquirer`, `prompts` |
| Shell commands | `Bash` tool | `child_process` wrappers |
| Terminal formatting | Markdown rendering | `chalk` |
| CLI argument parsing | `$ARGUMENTS` substitution | `commander` |

The plugin is pure markdown and JSON. It works immediately after installation with zero dependencies.
</context>

<instructions>
Build a Claude Code plugin that registers a `/review-changes` slash command. The plugin consists of exactly **5 files** in this structure:

```
review-changes/
├── .claude-plugin/plugin.json      # Plugin manifest
├── commands/review-changes.md      # Slash command (orchestrates the workflow)
├── agents/diff-analyzer.md         # Subagent (analyzes diffs, groups into features)
├── README.md                       # Documentation
└── LICENSE                         # MIT license
```

Create each file exactly as specified below. Do not add extra files, directories, or abstractions.
</instructions>

<architecture>
## How the two components interact

```
User runs: /review-changes staged
         │
         ▼
┌─────────────────────────────────────────────┐
│  commands/review-changes.md                 │
│  (orchestration — runs as the main Claude)  │
│                                             │
│  1. Parse $ARGUMENTS → git diff --cached    │
│  2. Bash: run git diff command              │
│  3. Agent: spawn diff-analyzer with diff    │◄── returns feature list
│  4. AskUserQuestion: feature selection      │
│  5. Show annotated diff for selection       │
│  6. AskUserQuestion: iterate or finish      │
└─────────────────────────────────────────────┘
         │
         │ step 3 spawns
         ▼
┌─────────────────────────────────────────────┐
│  agents/diff-analyzer.md                    │
│  (analysis — runs as a subagent)            │
│                                             │
│  - Receives: raw git diff                   │
│  - Groups changes by PURPOSE, not by file   │
│  - Returns: structured markdown with        │
│    features, summaries, file+line ranges    │
└─────────────────────────────────────────────┘
```

### Command: `review-changes` (orchestrator)
- Runs in the main Claude context with full tool access
- Handles the user-facing workflow: argument parsing, user interaction, diff display
- Uses the `Agent` tool to delegate analysis to `diff-analyzer`
- Uses `AskUserQuestion` for all user interaction (feature selection, iteration)

### Agent: `diff-analyzer` (analyzer)
- Runs as a subagent with `model: sonnet` (fast, good at code understanding)
- Has read-only tools: `Bash, Read, Grep, Glob`
- Single responsibility: receive a diff, return grouped features
- Groups by **purpose** — a single file may appear in multiple feature groups if it contains changes serving different purposes
</architecture>

<file_specifications>

## File 1: `.claude-plugin/plugin.json`

Create this exact JSON:

```json
{
  "name": "review-changes",
  "version": "1.0.0",
  "description": "Human-guided code review: groups git changes by logical feature and shows annotated diffs",
  "author": {
    "name": "Your Name"
  },
  "license": "MIT"
}
```

---

## File 2: `agents/diff-analyzer.md`

### Frontmatter

```yaml
---
name: diff-analyzer
description: Analyzes git diffs and groups changes into logical features by purpose. Used by the review-changes command.
tools: Bash, Read, Grep, Glob
model: sonnet
---
```

### Body (system prompt)

Write a system prompt that instructs the agent to:

1. **Receive** a git diff passed as input from the calling command
2. **Analyze** the changes and group them into logical features based on **purpose**, not file boundaries
   - A single file may appear in multiple feature groups if it contains changes serving different purposes
   - Look for patterns: bug fixes, new features, refactoring, configuration changes, test additions, dependency updates
3. **Return** a structured markdown response with this format for each feature:

```
## Feature: <short imperative title, under 60 chars>

**Summary:** <one-sentence description of what this group of changes accomplishes>

**Files:**
- `path/to/file.ts` (lines 12-45) — <brief note on what changed in this file for this feature>
- `path/to/other.ts` (lines 100-120) — <brief note>

**Files changed:** <count>
```

4. **Always** include an "All changes" feature as the last group that encompasses every file
5. **Order** features by significance (most impactful first)
6. Keep titles concise and in imperative form (e.g., "Add rate limiting to API endpoints", not "Rate limiting was added")
7. Keep summaries to one sentence
8. If the diff is empty or contains no meaningful changes, say so clearly

---

## File 3: `commands/review-changes.md`

### Frontmatter

```yaml
---
description: Review git changes grouped by logical feature with annotated diffs
argument-hint: [staged|unstaged|branch|commit <ref>|<ref1>..<ref2>]
allowed-tools: Bash, Read, Grep, Glob, Agent, AskUserQuestion
---
```

### Body (command prompt)

Write a command prompt that instructs Claude to execute the following 5-step workflow:

**Step 1 — Parse arguments and get the diff:**

Interpret `$ARGUMENTS` to determine the correct git diff command:

| `$ARGUMENTS` value | Git command |
|---|---|
| *(empty)* | `git diff` (all uncommitted changes, staged + unstaged) |
| `staged` | `git diff --cached` |
| `unstaged` | `git diff` |
| `branch` | `git diff $(git merge-base HEAD main)..HEAD` (auto-detect: try `main`, fall back to `master`) |
| `commit <ref>` | `git show <ref>` |
| `<ref1>..<ref2>` | `git diff <ref1>..<ref2>` |

Before running the diff:
- Verify the current directory is a git repository (run `git rev-parse --is-inside-work-tree`)
- If not a git repo, inform the user and stop

Run the git diff command using Bash. If the diff is empty, inform the user there are no changes to review and stop.

**Step 2 — Analyze changes with the diff-analyzer agent:**

Use the `Agent` tool to spawn the `diff-analyzer` agent. Pass the full diff output to the agent as context in the prompt. The agent will return a structured list of feature groups.

**Step 3 — Present feature selection:**

Use `AskUserQuestion` to present the feature groups as selectable options:
- Each option's **label**: feature title + file count, e.g., `Add rate limiting (3 files)`
- Each option's **description**: the one-line summary from the agent's analysis
- Include "All changes (N files)" as the last option
- If there is only one feature group (besides "All changes"), skip selection and review it directly

**Step 4 — Show annotated diff:**

For the selected feature, display an annotated diff:
- Print a feature header: `━━━ Feature: <title> ━━━━━━`
- For each file in the feature:
  - Print a file header: `── <file path> ──────────────`
  - Show the relevant diff hunks (the actual `+`/`-` lines from the diff)
  - After each file's hunks, print an annotation block using `│` prefix for visual distinction:
    - `│ ✦ What changed:` — factual summary of the code modification
    - `│ ✦ Why it matters:` — the purpose/impact of this change in the context of the feature
    - `│ ✦ Review hint:` — what a reviewer should pay attention to (edge cases, potential issues, style concerns)

**Step 5 — Iterate or finish:**

After displaying the annotated diff, use `AskUserQuestion` to ask what to do next:
- Options: "Review another feature", "Finish review"
- If "Review another feature": go back to Step 3 (show feature selection again, excluding already-reviewed features or showing them as reviewed)
- If "Finish review": print a brief summary of what was reviewed (which features, how many files) and end

---

## File 4: `README.md`

Write a README with these sections:

### What it does
One paragraph explaining the plugin: groups git changes by logical feature, lets you pick one, shows annotated diffs with explanations. Emphasize that it helps the *human* review — it's not automated bug-finding.

### Installation

```bash
# From a local directory
claude --plugin-dir ./review-changes

# Or install permanently
claude plugin install ./review-changes
```

### Usage

```bash
# Review all uncommitted changes (default)
/review-changes

# Review only staged changes
/review-changes staged

# Review only unstaged changes
/review-changes unstaged

# Review current branch vs main/master
/review-changes branch

# Review a specific commit
/review-changes commit abc123

# Review a range of commits
/review-changes abc123..def456
```

### How it differs from other review plugins
Brief explanation: `/code-review` and `/review-pr` do automated AI review (AI finds issues). `/review-changes` does human-guided review (AI helps the human understand changes).

---

## File 5: `LICENSE`

Standard MIT License with the current year.

</file_specifications>

<examples>
### Example: Feature Selection Menu

When the user runs `/review-changes`, after the diff-analyzer agent returns its analysis, the command presents this via `AskUserQuestion`:

```
3 feature groups detected in current changes:

? Which feature would you like to review?

  ● Add rate limiting to API endpoints (3 files)
    Adds express-rate-limit middleware with per-route configuration

  ○ Fix timezone bug in date formatter (2 files)
    Corrects UTC offset calculation in formatDate utility

  ○ Refactor database connection pooling (4 files)
    Replaces single connection with pg-pool, adds retry logic

  ○ All changes (7 files)
    View all changes across all features
```

### Example: Annotated Diff Output

After selecting "Fix timezone bug in date formatter":

```
━━━ Feature: Fix timezone bug in date formatter ━━━━━━━━━━━━

── src/utils/date.ts ──────────────────────────────────────

@@ -12,7 +12,7 @@ export function formatDate(date: Date, tz: string): string {
-  const offset = date.getTimezoneOffset();
+  const offset = getTimezoneOffset(date, tz);
   const adjusted = new Date(date.getTime() + offset * 60000);
-  return adjusted.toISOString().slice(0, 10);
+  return formatISO(adjusted, { representation: 'date' });

│ ✦ What changed: Replaced native getTimezoneOffset() with a
│   timezone-aware helper that accepts a tz string, and switched
│   from manual ISO slicing to date-fns formatISO.
│
│ ✦ Why it matters: getTimezoneOffset() returns the LOCAL system
│   offset, ignoring the target timezone entirely — this was the
│   root cause of dates shifting by one day for users in UTC+ zones.
│
│ ✦ Review hint: Verify that getTimezoneOffset handles DST
│   transitions correctly. Check if date-fns is already a
│   dependency or if this introduces a new one.

── tests/utils/date.test.ts ───────────────────────────────

@@ -45,6 +45,18 @@ describe('formatDate', () => {
+  it('handles positive UTC offsets correctly', () => {
+    const date = new Date('2024-01-15T23:30:00Z');
+    expect(formatDate(date, 'Asia/Tokyo')).toBe('2024-01-16');
+  });
+
+  it('handles DST transitions', () => {
+    const date = new Date('2024-03-10T09:00:00Z');
+    expect(formatDate(date, 'America/New_York')).toBe('2024-03-10');
+  });

│ ✦ What changed: Added two test cases covering UTC+ offset
│   (Tokyo, UTC+9) and a DST transition edge case.
│
│ ✦ Why it matters: These tests directly reproduce the reported
│   bug scenario — dates near midnight in positive-offset timezones.
│
│ ✦ Review hint: Consider adding a test for UTC-negative offsets
│   and for the exact moment of DST switch (2:00 AM local).
```

### Example: Iteration Prompt

After displaying the annotated diff:

```
? What would you like to do next?

  ● Review another feature
    Select a different feature group to review

  ○ Finish review
    End the review session with a summary
```
</examples>

<constraints>
- **This is a Claude Code plugin, not a standalone CLI.** The plugin consists entirely of markdown files and a JSON manifest. Do not create package.json, tsconfig.json, or any JavaScript/TypeScript source files.
- **No external dependencies.** Do not use or reference `commander`, `inquirer`, `prompts`, `chalk`, `@anthropic-ai/sdk`, `child_process`, or any npm packages. Claude Code provides all needed capabilities through its native tools.
- **One agent only.** The `diff-analyzer` agent handles all diff analysis. Do not create additional agents, utility scripts, or helper files.
- **Group by purpose, not by file.** This is the core differentiator — a file may appear in multiple feature groups because it contains changes serving different purposes.
- **Use `AskUserQuestion` for all user interaction.** Do not instruct Claude to print numbered menus and wait for text input. `AskUserQuestion` provides proper interactive selection.
- **Keep the agent focused.** The `diff-analyzer` agent only analyzes and groups. It does not display results, interact with the user, or annotate diffs. The command handles all of that.
- **Follow existing Claude Code conventions.** Use standard frontmatter fields, standard directory layout, standard tool names. Do not invent custom conventions.
- **Keep it simple.** No config files, no environment variables, no build steps, no hooks, no MCP servers. The plugin should work immediately after installation.
</constraints>

<quality_checks>
After creating all 5 files, verify:

- [ ] Plugin directory has exactly: `.claude-plugin/plugin.json`, `commands/review-changes.md`, `agents/diff-analyzer.md`, `README.md`, `LICENSE`
- [ ] `plugin.json` is valid JSON with `name`, `version`, and `description` fields
- [ ] `agents/diff-analyzer.md` has YAML frontmatter with `name`, `description`, `tools`, and `model` fields
- [ ] `agents/diff-analyzer.md` body instructs the agent to group changes by purpose and return structured markdown
- [ ] `commands/review-changes.md` has YAML frontmatter with `description`, `argument-hint`, and `allowed-tools` fields
- [ ] `commands/review-changes.md` body describes the complete 5-step workflow (parse args → analyze → select → annotate → iterate)
- [ ] The command handles all argument variants: empty, `staged`, `unstaged`, `branch`, `commit <ref>`, `<ref>..<ref>`
- [ ] The command handles edge cases: not a git repo, no changes found, only one feature group
- [ ] No references to standalone dependencies anywhere (no commander, inquirer, chalk, @anthropic-ai/sdk, child_process)
- [ ] No JavaScript or TypeScript files — the plugin is pure markdown + JSON
- [ ] `AskUserQuestion` is used for feature selection and iteration (not manual text menus)
- [ ] The `Agent` tool is used to spawn `diff-analyzer` (not inline analysis in the command)
- [ ] Loading with `claude --plugin-dir ./review-changes` should make `/review-changes` available as a slash command
</quality_checks>
