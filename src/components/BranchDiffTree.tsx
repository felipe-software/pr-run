import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import type { BranchDiffFile } from "../types/pr-run";

type BranchDiffTreeProps = {
    files: BranchDiffFile[];
    selectedPath?: string;
    onSelectFile?: (path: string) => void;
};

type DiffTreeNode = {
    additions: number;
    children: DiffTreeNode[];
    deletions: number;
    name: string;
    path: string;
    type: "directory" | "file";
};

type MutableDiffTreeNode = Omit<DiffTreeNode, "children"> & {
    children: Map<string, MutableDiffTreeNode>;
};

export function BranchDiffTree({
    files,
    selectedPath,
    onSelectFile,
}: BranchDiffTreeProps) {
    const tree = useMemo(() => buildDiffTree(files), [files]);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
        () => new Set(),
    );

    if (tree.length === 0) {
        return null;
    }

    function toggleFolder(path: string) {
        setCollapsedFolders((current) => {
            const next = new Set(current);

            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }

            return next;
        });
    }

    return (
        <div className="branch-diff-tree" aria-label="Changed files">
            {tree.map((node) => (
                <DiffTreeNodeRow
                    collapsedFolders={collapsedFolders}
                    depth={0}
                    key={node.path}
                    node={node}
                    selectedPath={selectedPath}
                    onSelectFile={onSelectFile}
                    onToggleFolder={toggleFolder}
                />
            ))}
        </div>
    );
}

type DiffTreeNodeRowProps = {
    collapsedFolders: Set<string>;
    depth: number;
    node: DiffTreeNode;
    selectedPath?: string;
    onSelectFile?: (path: string) => void;
    onToggleFolder: (path: string) => void;
};

function DiffTreeNodeRow({
    collapsedFolders,
    depth,
    node,
    selectedPath,
    onSelectFile,
    onToggleFolder,
}: DiffTreeNodeRowProps) {
    const isDirectory = node.type === "directory";
    const isCollapsed = collapsedFolders.has(node.path);
    const paddingLeft = `${depth * 14}px`;

    if (!isDirectory) {
        return (
            <button
                className={[
                    "branch-diff-row branch-diff-file-row",
                    selectedPath === node.path ? "branch-diff-row-active" : "",
                ].join(" ")}
                style={{ paddingLeft }}
                type="button"
                onClick={() => onSelectFile?.(node.path)}
            >
                <span className="branch-diff-chevron-spacer" />
                <File className="branch-diff-icon" />
                <span className="branch-diff-label" title={node.path}>
                    {node.name}
                </span>
                <DiffCounts
                    additions={node.additions}
                    deletions={node.deletions}
                />
            </button>
        );
    }

    return (
        <Fragment>
            <button
                aria-expanded={!isCollapsed}
                className="branch-diff-row branch-diff-folder-row"
                style={{ paddingLeft }}
                type="button"
                onClick={() => onToggleFolder(node.path)}
            >
                {isCollapsed ? (
                    <ChevronRight className="branch-diff-chevron" />
                ) : (
                    <ChevronDown className="branch-diff-chevron" />
                )}
                <Folder className="branch-diff-icon" />
                <span className="branch-diff-label" title={node.path}>
                    {node.name}
                </span>
                <DiffCounts
                    additions={node.additions}
                    deletions={node.deletions}
                />
            </button>
            {!isCollapsed
                ? node.children.map((child) => (
                      <DiffTreeNodeRow
                          collapsedFolders={collapsedFolders}
                          depth={depth + 1}
                          key={child.path}
                          node={child}
                          selectedPath={selectedPath}
                          onSelectFile={onSelectFile}
                          onToggleFolder={onToggleFolder}
                      />
                  ))
                : null}
        </Fragment>
    );
}

type DiffCountsProps = {
    additions: number;
    deletions: number;
};

function DiffCounts({ additions, deletions }: DiffCountsProps) {
    return (
        <span className="branch-diff-counts">
            <span className="branch-diff-count-add">+{additions}</span>
            <span className="branch-diff-count-remove">-{deletions}</span>
        </span>
    );
}

function buildDiffTree(files: BranchDiffFile[]) {
    const root = createMutableNode("", "", "directory");

    for (const file of files) {
        const parts = file.path.split("/").filter(Boolean);

        if (parts.length === 0) {
            continue;
        }

        let current = root;

        parts.forEach((part, index) => {
            const isFile = index === parts.length - 1;
            const childPath = parts.slice(0, index + 1).join("/");
            const existing = current.children.get(part);
            const child =
                existing ??
                createMutableNode(
                    part,
                    childPath,
                    isFile ? "file" : "directory",
                );

            if (!existing) {
                current.children.set(part, child);
            }

            if (isFile) {
                child.additions += file.additions;
                child.deletions += file.deletions;
            }

            current = child;
        });
    }

    return finalizeChildren(root);
}

function finalizeChildren(node: MutableDiffTreeNode): DiffTreeNode[] {
    return [...node.children.values()]
        .sort((left, right) => {
            if (left.type !== right.type) {
                return left.type === "directory" ? -1 : 1;
            }

            return left.name.localeCompare(right.name);
        })
        .map((child) => {
            const children = finalizeChildren(child);

            if (child.type === "directory") {
                child.additions = sumBy(children, "additions");
                child.deletions = sumBy(children, "deletions");
            }

            return {
                additions: child.additions,
                children,
                deletions: child.deletions,
                name: child.name,
                path: child.path,
                type: child.type,
            };
        });
}

function createMutableNode(
    name: string,
    path: string,
    type: DiffTreeNode["type"],
): MutableDiffTreeNode {
    return {
        additions: 0,
        children: new Map(),
        deletions: 0,
        name,
        path,
        type,
    };
}

function sumBy(nodes: DiffTreeNode[], key: "additions" | "deletions") {
    return nodes.reduce((total, node) => total + node[key], 0);
}
