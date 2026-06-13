import { RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { formatBranchAge } from "@/lib/format";
import { SidebarItemIcon } from "@/lib/components/templates/sidebar/sidebar-item-icon";
import type { BranchInfo } from "@/types/pr-run";

type SidebarBranchItemProps = {
    branch: BranchInfo;
    isRemovingWorktree: boolean;
    isSelected: boolean;
    onRemoveWorktree: (branchName: string) => Promise<void>;
    onSelectBranch: (branchName: string) => void;
};

export function SidebarBranchItem({
    branch,
    isRemovingWorktree,
    isSelected,
    onRemoveWorktree,
    onSelectBranch,
}: SidebarBranchItemProps) {
    return (
        <div
            className={[
                "tree-branch-shell",
                isSelected ? "tree-row-selected tree-branch-selected" : "",
            ].join(" ")}
        >
            <button
                aria-selected={isSelected}
                className={[
                    "tree-row tree-branch-row",
                    branch.isStale ? "tree-branch-stale" : "",
                ].join(" ")}
                type="button"
                onClick={() => onSelectBranch(branch.name)}
            >
                <SidebarItemIcon branch={branch} />
                <span className="tree-label min-w-0 flex-1 truncate">
                    {branch.name}
                </span>
                <span className="tree-meta">
                    {formatBranchAge(branch.lastCommitTimestamp)}
                </span>
            </button>
            {branch.hasWorktree ? (
                <Button
                    aria-label={`Remove ${branch.name} worktree`}
                    className="tree-branch-action"
                    isDisabled={isRemovingWorktree}
                    isIconOnly
                    size="sm"
                    type="button"
                    onPress={() => void onRemoveWorktree(branch.name)}
                >
                    {isRemovingWorktree ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                </Button>
            ) : null}
        </div>
    );
}
