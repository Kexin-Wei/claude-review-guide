import Anthropic from "@anthropic-ai/sdk";
import type { FeatureGroup } from "@/types";
import { v4 as uuidv4 } from "uuid";

const SEMANTIC_GROUPING_SYSTEM_PROMPT = `You are a semantic diff analyzer. You receive a git diff and group the changes by PURPOSE — not by file. A single file may appear in multiple groups if different hunks serve different purposes.

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

Respond ONLY with valid JSON matching this exact schema (no markdown fences, no commentary):
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
}`;

export async function analyzeDiff(
  diff: string,
  apiKey: string,
  model: string = "claude-sonnet-4-6"
): Promise<FeatureGroup[]> {
  const client = new Anthropic({ apiKey });

  // For very large diffs, truncate with a warning
  const maxDiffSize = 100_000;
  let truncated = false;
  let processedDiff = diff;
  if (diff.length > maxDiffSize) {
    processedDiff = diff.slice(0, maxDiffSize);
    truncated = true;
  }

  const userMessage = truncated
    ? `Analyze the following git diff and group changes by semantic purpose. NOTE: This diff was truncated at ${maxDiffSize} characters — some files may be missing.\n\n<diff>\n${processedDiff}\n</diff>`
    : `Analyze the following git diff and group changes by semantic purpose.\n\n<diff>\n${processedDiff}\n</diff>`;

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SEMANTIC_GROUPING_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON, stripping any markdown fences if present
  let jsonText = textContent.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonText);

  // Add UUIDs and diff content to each group
  const groups: FeatureGroup[] = parsed.groups.map(
    (group: Omit<FeatureGroup, "id">) => ({
      ...group,
      id: uuidv4(),
      files: group.files.map((file) => ({
        ...file,
        diff: extractFileDiff(diff, file.path),
      })),
    })
  );

  return groups;
}

function extractFileDiff(fullDiff: string, filePath: string): string {
  const filePattern = new RegExp(
    `diff --git a/.*?${escapeRegex(filePath)} b/.*?${escapeRegex(filePath)}`,
    "m"
  );
  const match = fullDiff.match(filePattern);
  if (!match || match.index === undefined) return "";

  const start = match.index;
  const nextDiff = fullDiff.indexOf("\ndiff --git ", start + 1);
  return nextDiff === -1
    ? fullDiff.slice(start)
    : fullDiff.slice(start, nextDiff);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
