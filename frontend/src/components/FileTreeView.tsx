"use client";

import { useMemo } from "react";

interface FileTreeViewProps {
  files: string[];
  searchQuery?: string;
  highlightedFiles?: string[];
}

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  isFile: boolean;
}

function buildTree(files: string[]): TreeNode {
  const root: TreeNode = {
    name: "",
    path: "",
    children: new Map(),
    isFile: false,
  };

  for (const file of files) {
    const parts = file.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          children: new Map(),
          isFile: isLast,
        });
      }

      current = current.children.get(part)!;
    }
  }

  return root;
}

function highlightSearch(
  text: string,
  query: string | undefined
): React.ReactNode {
  if (!query || !query.trim()) return text;
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={i}
          className="bg-yellow-300 dark:bg-yellow-600/50 text-inherit"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
}

function TreeNodeView({
  node,
  depth,
  searchQuery,
  highlightedFiles,
}: {
  node: TreeNode;
  depth: number;
  searchQuery?: string;
  highlightedFiles?: string[];
}) {
  const children = Array.from(node.children.values()).sort((a, b) => {
    // Directories first, then files
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  const isHighlighted = highlightedFiles?.includes(node.path);

  return (
    <>
      {node.name && (
        <div
          className={`flex items-center py-0.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
            isHighlighted
              ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {node.isFile ? (
            <span className="w-4 text-center text-zinc-400 text-xs mr-1">
              &#9702;
            </span>
          ) : (
            <span className="w-4 text-center text-zinc-400 text-xs mr-1">
              &#9662;
            </span>
          )}
          <span
            className={`text-xs font-mono ${
              node.isFile
                ? "text-zinc-600 dark:text-zinc-300"
                : "text-zinc-800 dark:text-zinc-200 font-medium"
            }`}
          >
            {highlightSearch(node.name, searchQuery)}
          </span>
        </div>
      )}
      {children.map((child) => (
        <TreeNodeView
          key={child.path}
          node={child}
          depth={node.name ? depth + 1 : depth}
          searchQuery={searchQuery}
          highlightedFiles={highlightedFiles}
        />
      ))}
    </>
  );
}

export default function FileTreeView({
  files,
  searchQuery,
  highlightedFiles,
}: FileTreeViewProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400 dark:text-zinc-500 text-sm">
        Run a code analysis to see the file tree
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-700">
        {files.length} files in repository
      </div>
      <TreeNodeView
        node={tree}
        depth={0}
        searchQuery={searchQuery}
        highlightedFiles={highlightedFiles}
      />
    </div>
  );
}
