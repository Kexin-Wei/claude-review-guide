import { execFile } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import path from "path";

const execFileAsync = promisify(execFile);

const KEY_FILES = [
  "package.json",
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "vite.config.ts",
  "vite.config.js",
  "Dockerfile",
  "docker-compose.yml",
  "Cargo.toml",
  "go.mod",
  "pyproject.toml",
  "requirements.txt",
  "Makefile",
];

const SOURCE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java", ".rb",
];

const IGNORE_DIRS = [
  "node_modules", ".git", "dist", "build", ".next", "__pycache__", "vendor",
];

export interface RepoSnapshot {
  fileTree: string[];
  keyFiles: { path: string; content: string }[];
  sourceFiles: { path: string; content: string }[];
  stats: {
    totalFiles: number;
    fileTypes: Record<string, number>;
  };
}

export async function scanRepo(
  repoPath: string,
  includeUncommitted: boolean = false
): Promise<RepoSnapshot> {
  // Get tracked files
  const { stdout } = await execFileAsync("git", ["ls-files"], {
    cwd: repoPath,
    maxBuffer: 10 * 1024 * 1024,
  });

  const trackedFiles = stdout.trim().split("\n").filter(Boolean);
  let allFiles = trackedFiles;

  if (includeUncommitted) {
    // Include untracked files (new files not yet committed)
    try {
      const result = await execFileAsync(
        "git",
        ["ls-files", "--others", "--exclude-standard"],
        { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 }
      );
      const untrackedFiles = result.stdout.trim().split("\n").filter(Boolean);
      allFiles = [...trackedFiles, ...untrackedFiles];
    } catch {
      // ignore — untracked listing is best-effort
    }
  }

  const fileTypes: Record<string, number> = {};
  for (const file of allFiles) {
    const ext = path.extname(file) || "(no ext)";
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  }

  // Read key config files
  const keyFiles: { path: string; content: string }[] = [];
  for (const keyFile of KEY_FILES) {
    const match = allFiles.find(
      (f) => f === keyFile || f.endsWith(`/${keyFile}`)
    );
    if (match) {
      try {
        const content = await readFile(path.join(repoPath, match), "utf-8");
        keyFiles.push({ path: match, content: content.slice(0, 5000) });
      } catch {
        // skip unreadable files
      }
    }
  }

  // Sample source files — prioritize entry points
  const entryPatterns = [
    /index\.[tj]sx?$/,
    /main\.[tj]sx?$/,
    /app\.[tj]sx?$/,
    /page\.[tj]sx?$/,
    /layout\.[tj]sx?$/,
    /route\.[tj]sx?$/,
    /server\.[tj]sx?$/,
    /mod\.rs$/,
    /lib\.rs$/,
    /main\.go$/,
  ];

  const sourceCandidates = allFiles.filter(
    (f) =>
      SOURCE_EXTENSIONS.some((ext) => f.endsWith(ext)) &&
      !IGNORE_DIRS.some(
        (dir) => f.includes(`/${dir}/`) || f.startsWith(`${dir}/`)
      )
  );

  const entryFiles = sourceCandidates.filter((f) =>
    entryPatterns.some((p) => p.test(f))
  );
  const otherFiles = sourceCandidates.filter(
    (f) => !entryPatterns.some((p) => p.test(f))
  );

  const toRead = [...entryFiles.slice(0, 20), ...otherFiles.slice(0, 10)];

  const sourceFiles: { path: string; content: string }[] = [];
  for (const file of toRead) {
    try {
      const content = await readFile(path.join(repoPath, file), "utf-8");
      sourceFiles.push({ path: file, content: content.slice(0, 3000) });
    } catch {
      // skip unreadable files
    }
  }

  return {
    fileTree: allFiles,
    keyFiles,
    sourceFiles,
    stats: {
      totalFiles: allFiles.length,
      fileTypes,
    },
  };
}
