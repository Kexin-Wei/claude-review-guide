export interface CodeBlock {
  name: string;
  type: "function" | "class" | "hook" | "component" | "method" | "constant" | "type" | "interface" | "module";
  lineStart: number;
  lineEnd: number;
  description: string;
}

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
  blocks?: CodeBlock[];
  annotations: {
    whatChanged: string;
    whyItMatters: string;
    reviewHint: string;
  };
}

export interface UmlModule {
  name: string;
  description: string;
  type: "layer" | "module" | "service" | "component";
  files: string[];
  exports: string[];
  dependsOn: string[];
}

export interface AnalysisResult {
  id: string;
  groups: FeatureGroup[];
  rawDiff: string;
  analyzedAt: string;
  cached: boolean;
  type: "diff" | "repo";
  fileTree?: string[];
  umlStructure?: UmlModule[];
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
}

export type RepoScope = "all" | "committed";

export interface RepoAnalysisRequest {
  repoPath: string;
  repoScope?: RepoScope;
}

export type TabType = "git-changes" | "commit-analysis" | "code-analysis";

export interface ReviewState {
  [groupId: string]: Set<string>; // group ID → set of reviewed file paths
}
