import { RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { formatBranchAge } from "@/lib/format";
import { SidebarItemIcon } from "@/lib/components/templates/sidebar/sidebar-item-icon";
import { cn } from "@/lib/utils/cn";
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
            className={cn(
                "flex items-stretch gap-1 rounded-sm",
                isSelected &&
                    "bg-muted/20 shadow-[inset_2px_0_0_0] shadow-foreground",
            )}
        >
            <button
                aria-selected={isSelected}
                className={cn(
                    "relative flex min-w-0 flex-1 items-center gap-2 bg-transparent px-1.5 py-1.5 text-left text-foreground transition before:absolute before:top-1/2 before:left-[-8px] before:block before:h-px before:w-[19px] before:-translate-y-1/2 before:bg-border before:content-[''] hover:bg-muted/20 hover:text-foreground",
                    branch.isStale && "text-muted-foreground",
                )}
                type="button"
                onClick={() => onSelectBranch(branch.name)}
            >
                <SidebarItemIcon branch={branch} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-[1.35] tracking-[-0.01em]">
                        {branch.name}
                    </span>
                    <span className="block truncate text-[11px] leading-[1.35] text-muted-foreground">
                        {branch.source === "pull-request" ? "PR" : "Branch"}
                    </span>
                </span>
                <span className="text-[11px] leading-[1.35] text-muted-foreground">
                    {formatBranchAge(branch.lastCommitTimestamp)}
                </span>
            </button>
            {branch.hasWorktree ? (
                <Button
                    aria-label={`Remove ${branch.name} worktree`}
                    className="mt-0.5 h-7 w-7 min-w-7 px-0 opacity-70 hover:opacity-100"
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
