export interface FeatureGroup {
  id: string;
  title: string;
  summary: string;
  category: string;
  significance: number;
  files: FileChange[];
}

export interface FileChange {
  path: string;
  lineRange?: string;
  description: string;
  diff: string;
  annotations: {
    whatChanged: string;
    whyItMatters: string;
    reviewHint: string;
  };
}

export interface AnalysisResult {
  id: string;
  groups: FeatureGroup[];
  rawDiff: string;
  analyzedAt: string;
  cached: boolean;
}

export interface RepoValidation {
  valid: boolean;
  branch: string;
  remoteUrl?: string;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export type DiffScope = "all" | "staged" | "unstaged" | "branch" | "commit" | "range";

export interface AnalyzeRequest {
  repoPath: string;
  scope: DiffScope;
  commitRef?: string;
  fromRef?: string;
  toRef?: string;
  apiKey: string;
}

export type TabType = "git-changes" | "commit-analysis" | "code-analysis";

export interface ReviewState {
  [groupId: string]: Set<string>; // group ID → set of reviewed file paths
}
