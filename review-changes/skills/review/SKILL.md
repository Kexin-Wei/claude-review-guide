---
name: review-changes
description: Semantically group and review git changes with AI-powered annotations
argument-hint: "[staged|unstaged|branch|commit <ref>|<ref1>..<ref2>]"
allowed-tools: Bash, Read, Grep, Glob, Agent, AskUserQuestion
---

# Review Changes Command

You are an interactive code review orchestrator. Follow these 5 steps exactly.

## Step 1 — Parse Arguments and Get Diff

First, verify this is a git repository:

```bash
git rev-parse --is-inside-work-tree
```

If this fails, tell the user "Not inside a git repository" and stop.

Then, determine the diff command based on the argument provided:

| Argument | Git Command | Description |
|----------|-------------|-------------|
| *(empty / no argument)* | `git diff HEAD` | All uncommitted changes (staged + unstaged) |
| `staged` | `git diff --cached` | Only staged changes |
| `unstaged` | `git diff` | Only unstaged changes |
| `branch` | `git diff $(git merge-base HEAD main)..HEAD` | All changes on current branch vs main (fallback to `master` if `main` doesn't exist) |
| `commit <ref>` | `git show <ref> --format=""` | Changes introduced by a specific commit |
| `<ref1>..<ref2>` | `git diff <ref1>..<ref2>` | Changes between two refs |

### Error handling

- **Not a git repo:** Print an error message and stop.
- **Empty diff:** Tell the user "No changes found for the given scope" and stop.
- **Unrecognized argument:** Tell the user the argument wasn't recognized, show the usage table above, and stop.
- **Invalid ref:** If the git command fails (bad commit ref, etc.), show the git error and stop.

For the `branch` argument, try `main` first. If that fails (branch doesn't exist), fall back to `master`. If both fail, tell the user you couldn't determine the base branch and suggest they use the `<ref1>..<ref2>` syntax instead.

Store the full diff output for use in the next steps.

## Step 2 — Analyze with diff-analyzer Agent

Spawn the `diff-analyzer` agent using the Agent tool. Pass the full diff as context in your prompt to the agent. The agent will return structured markdown with feature groups.

Example prompt to the agent:
```
Analyze the following git diff and group the changes by semantic purpose.

<diff>
{the full diff content}
</diff>
```

Parse the agent's response to extract the list of feature groups (title, summary, files, file count).

## Step 3 — Present Feature Selection

If there is only **one feature group** (besides "All changes"), skip selection and proceed directly to Step 4 with that feature.

Otherwise, use `AskUserQuestion` to let the user pick which feature to review:
- Present up to **3 feature groups** as options (the most significant ones, excluding "All changes")
- Add **"All changes"** as the final option
- Each option should have:
  - **label:** Feature title + file count in parentheses, e.g., "Add user auth (4 files)"
  - **description:** The one-sentence summary from the analysis
- The user can always select "Other" (auto-provided by AskUserQuestion) to type a custom feature name from the full list

Keep track of which features have been reviewed. When returning to this step after a review, mark previously reviewed features with "(reviewed)" in their label.

## Step 4 — Show Annotated Diff

For the selected feature, display an annotated review:

### Feature Header
```
━━━ Feature: <title> ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Per File

For each file in the selected feature:

1. **File header:**
   ```
   ── <file path> ──────────────────────────────────
   ```

2. **Diff hunks:** Show the actual diff hunks for this file. Use `git diff` or `git show` output filtered to this file. Show all hunks for the file (don't try to surgically extract specific line ranges).

   To get per-file diffs, run the appropriate git command with `-- <filepath>` appended.

3. **Annotations:** After each file's diff, provide these three annotations. Generate these yourself (do NOT use the agent for this — you are the main model and better suited for nuanced analysis):

   ```
   │ ✦ What changed: <factual summary of the modifications in this file>
   │ ✦ Why it matters: <the purpose and impact of these changes>
   │ ✦ Review hint: <what a reviewer should pay attention to — potential issues, edge cases, or things to verify>
   ```

Keep annotations concise but insightful. Focus on things that actually matter for review — don't state the obvious.

## Step 5 — Iterate or Finish

After completing the annotated review for a feature, use `AskUserQuestion` to ask the user what to do next:

- **Option 1: "Review another feature"** — Return to Step 3 with the feature list, marking the just-reviewed feature as "(reviewed)"
- **Option 2: "Finish review"** — Print a summary and end

### Summary format (on finish):

```
━━━ Review Complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Features reviewed: <count>
  • <feature title 1> (<file count> files)
  • <feature title 2> (<file count> files)
Total files reviewed: <unique file count across all reviewed features>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Important Notes

- Always use `AskUserQuestion` for user interaction — never use text-based menus or expect the user to type responses inline.
- Always use the `Agent` tool to spawn the `diff-analyzer` agent — do not try to do the grouping analysis yourself in the main context.
- The diff content may be large. When passing it to the agent, include the complete diff — do not truncate.
- If a file appears in multiple feature groups, it's fine to show its diff multiple times when reviewing different features.
