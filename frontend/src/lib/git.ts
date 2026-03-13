import { execFile } from "child_process";
import { promisify } from "util";
import type { DiffScope } from "@/types";

const execFileAsync = promisify(execFile);

const COMMIT_REF_PATTERN = /^[a-zA-Z0-9._/~^-]+$/;

function validateRef(ref: string): string {
  if (!COMMIT_REF_PATTERN.test(ref)) {
    throw new Error(`Invalid git ref: ${ref}`);
  }
  return ref;
}

async function git(
  args: string[],
  cwd: string
): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: 50 * 1024 * 1024, // 50MB for large diffs
  });
  return stdout;
}

export async function validateRepo(
  repoPath: string
): Promise<{ valid: boolean; branch: string; remoteUrl?: string }> {
  try {
    await git(["rev-parse", "--is-inside-work-tree"], repoPath);
    const branch = (
      await git(["rev-parse", "--abbrev-ref", "HEAD"], repoPath)
    ).trim();
    let remoteUrl: string | undefined;
    try {
      remoteUrl = (
        await git(["remote", "get-url", "origin"], repoPath)
      ).trim();
    } catch {
      // no remote configured
    }
    return { valid: true, branch, remoteUrl };
  } catch {
    return { valid: false, branch: "" };
  }
}

export async function getRecentCommits(
  repoPath: string,
  count: number = 10
): Promise<{ hash: string; message: string; author: string; date: string }[]> {
  const log = await git(
    [
      "log",
      `--oneline`,
      `-${count}`,
      "--format=%H|%s|%an|%aI",
    ],
    repoPath
  );
  return log
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [hash, message, author, date] = line.split("|");
      return { hash, message, author, date };
    });
}

async function detectMainBranch(repoPath: string): Promise<string> {
  try {
    await git(["rev-parse", "--verify", "main"], repoPath);
    return "main";
  } catch {
    try {
      await git(["rev-parse", "--verify", "master"], repoPath);
      return "master";
    } catch {
      return "main";
    }
  }
}

export async function getDiff(
  repoPath: string,
  scope: DiffScope,
  commitRef?: string,
  fromRef?: string,
  toRef?: string
): Promise<string> {
  switch (scope) {
    case "all":
      return git(["diff", "HEAD"], repoPath);
    case "staged":
      return git(["diff", "--cached"], repoPath);
    case "unstaged":
      return git(["diff"], repoPath);
    case "branch": {
      const mainBranch = await detectMainBranch(repoPath);
      const mergeBase = (
        await git(["merge-base", "HEAD", mainBranch], repoPath)
      ).trim();
      return git(["diff", `${mergeBase}..HEAD`], repoPath);
    }
    case "commit": {
      if (!commitRef) throw new Error("commitRef required for commit scope");
      return git(
        ["show", validateRef(commitRef), "--format="],
        repoPath
      );
    }
    case "range": {
      if (!fromRef || !toRef)
        throw new Error("fromRef and toRef required for range scope");
      return git(
        ["diff", `${validateRef(fromRef)}..${validateRef(toRef)}`],
        repoPath
      );
    }
    default:
      throw new Error(`Unknown scope: ${scope}`);
  }
}
