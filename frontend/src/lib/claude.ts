import { spawn } from "child_process";
import type { FeatureGroup, UmlModule } from "@/types";
import type { RepoSnapshot } from "@/lib/repo-scanner";
import { v4 as uuidv4 } from "uuid";

const DIFF_SYSTEM_PROMPT = `You are a semantic diff analyzer that outputs ONLY valid JSON. You receive a git diff and group the changes by PURPOSE — not by file.

Rules:
- Group titles: imperative tense, under 60 characters
- Order groups by significance (most impactful first)
- Always include an "All changes" group at the end listing every file
- For very large diffs (50+ files), limit to 8 purpose groups + "All changes"
- Merge minor/trivial groups together
- For each file, identify the specific code blocks (functions, classes, hooks, components) that were changed — NOT just the file
- Each file MUST have a "blocks" array listing the specific changed code units with their line ranges
- If a whole file is new/deleted, list the main exports as blocks

OUTPUT FORMAT: You must respond with ONLY a JSON object. No explanations, no markdown, no text before or after. Start your response with { and end with }.

JSON schema:
{"groups":[{"title":"string","summary":"string","category":"string","significance":0,"files":[{"path":"string","lineRange":"string","description":"string","blocks":[{"name":"string","type":"function|class|hook|component|method|constant|type|interface|module","lineStart":0,"lineEnd":0,"description":"string"}],"annotations":{"whatChanged":"string","whyItMatters":"string","reviewHint":"string"}}]}]}`;

const REPO_SYSTEM_PROMPT = `You are a repository architecture analyzer that outputs ONLY valid JSON. You receive a repository snapshot and produce TWO things:

1. "umlStructure": A high-level module/layer diagram of the codebase infrastructure. Each module represents a logical layer or subsystem (e.g., "API Layer", "Data Access", "UI Components", "Business Logic"). Include:
   - name: short module name
   - description: what this layer/module does
   - type: "layer" | "module" | "service" | "component"
   - files: key file paths belonging to this module
   - exports: the most important exported functions/classes/components (just names, e.g. "analyzeDiff", "useAnalysis", "DiffView")
   - dependsOn: names of other modules this depends on

2. "groups": Feature groups based on the modules above. Each group corresponds to a module or cross-cutting feature. For each file:
   - Identify specific code blocks (functions, classes, hooks, components, types) — NOT just the file
   - Each file MUST have a "blocks" array listing the key code units with line ranges
   - Focus on the most important/interesting code blocks, not every tiny helper

Rules:
- umlStructure: 4-8 modules, ordered by dependency (foundational layers first)
- groups: 6-8 groups, ordered by architectural significance
- The FIRST group should be "Architecture" — overall project structure
- For each file provide: whatChanged (purpose), whyItMatters (significance), reviewHint (key notes)
- Include only the most important files in each group

OUTPUT FORMAT: You must respond with ONLY a JSON object. No explanations, no markdown, no text before or after. Start your response with { and end with }.

JSON schema:
{"umlStructure":[{"name":"string","description":"string","type":"layer|module|service|component","files":["string"],"exports":["string"],"dependsOn":["string"]}],"groups":[{"title":"string","summary":"string","category":"string","significance":0,"files":[{"path":"string","description":"string","blocks":[{"name":"string","type":"function|class|hook|component|method|constant|type|interface|module","lineStart":0,"lineEnd":0,"description":"string"}],"annotations":{"whatChanged":"string","whyItMatters":"string","reviewHint":"string"}}]}]}`;

function queryClaudeJson(
  systemPrompt: string,
  userMessage: string
): Promise<{ groups: Omit<FeatureGroup, "id">[]; umlStructure?: UmlModule[] }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      ["-p", "--debug", "--system-prompt", systemPrompt],
      {
        env: { ...process.env, CLAUDECODE: "" },
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stdout += chunk;
      // Stream stdout chunks to console in real-time
      process.stdout.write(`[claude:out] ${chunk.slice(0, 200)}\n`);
    });

    proc.stderr.on("data", (data: Buffer) => {
      const chunk = data.toString();
      stderr += chunk;
      // Stream stderr (verbose logs) to console in real-time
      process.stderr.write(`[claude:log] ${chunk}`);
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`claude exited with code ${code}: ${stderr.slice(0, 500)}`)
        );
        return;
      }

      const result = stdout.trim();
      if (!result) {
        reject(new Error("No response from Claude CLI"));
        return;
      }

      // Parse JSON from response — handle various formats
      try {
        // 1. Strip markdown fences
        let text = result;
        const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (fenceMatch) {
          text = fenceMatch[1];
        }

        // 2. Try direct parse
        try {
          const parsed = JSON.parse(text);
          if (parsed.groups) {
            resolve(parsed);
            return;
          }
        } catch {
          // continue to extraction
        }

        // 3. Extract JSON object containing "groups" array
        let jsonStart = text.indexOf('{"groups"');
        if (jsonStart === -1) {
          // Also try finding umlStructure-first format
          jsonStart = text.indexOf('{"umlStructure"');
        }
        if (jsonStart === -1) {
          // Try finding any { that precedes "groups"
          const altMatch = text.match(
            /\{[\s\S]*?"groups"\s*:\s*\[[\s\S]*$/
          );
          if (altMatch) {
            try {
              resolve(JSON.parse(altMatch[0]));
              return;
            } catch {
              // fall through
            }
          }
          reject(
            new Error(
              `No JSON with "groups" found in response: ${text.slice(0, 200)}`
            )
          );
          return;
        }

        // Find matching closing brace by counting braces
        let depth = 0;
        let jsonEnd = -1;
        for (let i = jsonStart; i < text.length; i++) {
          if (text[i] === "{") depth++;
          else if (text[i] === "}") {
            depth--;
            if (depth === 0) {
              jsonEnd = i + 1;
              break;
            }
          }
        }

        if (jsonEnd === -1) {
          reject(new Error("Unterminated JSON object in response"));
          return;
        }

        resolve(JSON.parse(text.slice(jsonStart, jsonEnd)));
      } catch (err) {
        reject(
          new Error(
            `JSON parse error: ${err instanceof Error ? err.message : err} | response: ${result.slice(0, 300)}`
          )
        );
      }
    });

    // Send prompt via stdin (handles large inputs)
    proc.stdin.write(userMessage);
    proc.stdin.end();
  });
}

export async function analyzeDiff(diff: string): Promise<FeatureGroup[]> {
  const maxDiffSize = 100_000;
  let truncated = false;
  let processedDiff = diff;
  if (diff.length > maxDiffSize) {
    processedDiff = diff.slice(0, maxDiffSize);
    truncated = true;
  }

  const userMessage = truncated
    ? `Analyze this git diff. NOTE: Truncated at ${maxDiffSize} chars.\n\n<diff>\n${processedDiff}\n</diff>\n\nRespond with ONLY the JSON object.`
    : `Analyze this git diff.\n\n<diff>\n${processedDiff}\n</diff>\n\nRespond with ONLY the JSON object.`;

  const parsed = await queryClaudeJson(DIFF_SYSTEM_PROMPT, userMessage);

  return parsed.groups.map((group) => ({
    ...group,
    id: uuidv4(),
    files: group.files.map((file) => ({
      ...file,
      diff: extractFileDiff(diff, file.path),
    })),
  }));
}

export async function analyzeRepo(
  snapshot: RepoSnapshot
): Promise<{ groups: FeatureGroup[]; umlStructure: UmlModule[] }> {
  const fileTreeSection = snapshot.fileTree.join("\n");

  const keyFilesSection = snapshot.keyFiles
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  const sourceFilesSection = snapshot.sourceFiles
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  const statsSection = `Total files: ${snapshot.stats.totalFiles}\nFile types: ${Object.entries(
    snapshot.stats.fileTypes
  )
    .sort(([, a], [, b]) => b - a)
    .map(([ext, count]) => `${ext}: ${count}`)
    .join(", ")}`;

  let userMessage = `Analyze this repository architecture.\n\n<stats>\n${statsSection}\n</stats>\n\n<file-tree>\n${fileTreeSection}\n</file-tree>\n\n<config-files>\n${keyFilesSection}\n</config-files>\n\n<source-samples>\n${sourceFilesSection}\n</source-samples>\n\nRespond with ONLY the JSON object.`;

  const maxSize = 150_000;
  if (userMessage.length > maxSize) {
    userMessage =
      userMessage.slice(0, maxSize) +
      "\n\n[TRUNCATED]\n\nRespond with ONLY the JSON object.";
  }

  const parsed = await queryClaudeJson(REPO_SYSTEM_PROMPT, userMessage);

  const groups = parsed.groups.map((group) => ({
    ...group,
    id: uuidv4(),
    files: group.files.map((file) => ({
      ...file,
      diff: "",
    })),
  }));

  return {
    groups,
    umlStructure: parsed.umlStructure || [],
  };
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
