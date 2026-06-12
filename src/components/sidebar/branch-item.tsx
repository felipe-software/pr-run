import { RefreshCw, Trash2 } from "lucide-react";
import type { BranchInfo, ProjectConfig } from "../../types/pr-run";
import { formatBranchAge } from "../../lib/format";
import { AppButton } from "../atoms/AppButton";
import { SidebarItemIcon } from "./item-icon";

type SidebarBranchItemProps = {
    branch: BranchInfo;
    isRemovingWorktree: boolean;
    isSelected: boolean;
    project: ProjectConfig;
    onRemoveWorktree: (
        project: ProjectConfig,
        branch: BranchInfo,
    ) => Promise<void>;
    onSelectBranch: (
        project: ProjectConfig,
        branch: BranchInfo,
    ) => Promise<void>;
};

export function SidebarBranchItem({
    branch,
    isRemovingWorktree,
    isSelected,
    project,
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
                onClick={() => void onSelectBranch(project, branch)}
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
                <AppButton
                    aria-label={`Remove ${branch.name} worktree`}
                    className="tree-branch-action"
                    isDisabled={isRemovingWorktree}
                    isIconOnly
                    size="sm"
                    type="button"
                    onPress={() => void onRemoveWorktree(project, branch)}
                >
                    {isRemovingWorktree ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}
                </AppButton>
            ) : null}
        </div>
    );
}
