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
    const toneClassName = getBranchToneClassName(branch);

    // const branchChip =
    //     branch.source === "pull-request"
    //         ? branch.hasWorktree
    //             ? "Worktree"
    //             : "Pull Request"
    //         : "Branch";

    const branchChip = branch.hasWorktree ? "Worktree" : (branch.source ==="branch" ? "Branch" : "Pull Request")

    return (
        <div
            className={cn(
                "group/menu-sub-item relative flex min-w-0 rounded-lg",
                isSelected && "bg-sidebar-accent",
            )}
        >
            <button
                aria-selected={isSelected}
                className={cn(
                    "flex h-8 min-w-0 flex-1 grow cursor-pointer items-center gap-2 overflow-hidden rounded-lg bg-transparent px-1.5 text-left text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-foreground/20 active:bg-sidebar-accent",
                    isSelected && "text-sidebar-accent-foreground",
                    branch.isStale && !isSelected && "text-muted-foreground",
                )}
                type="button"
                onClick={() => onSelectBranch(branch.name)}
            >
                <SidebarItemIcon branch={branch} />
                <span className="min-w-0 flex-1 grow truncate text-[13px] leading-4 tracking-tight">
                    {branch.name}
                </span>
                <span className="ml-auto flex shrink-0 items-center justify-end gap-0 text-right">
                    <span
                        className={cn(
                            "shrink-0 rounded-sm px-1 text-[10px] font-medium leading-4",
                            toneClassName,
                        )}
                    >
                        {branchChip}
                    </span>
                    <span className="min-w-5 shrink-0 text-right text-[10px] leading-4 text-muted-foreground/30 tabular-nums opacity-50">
                        {formatBranchAge(branch.lastCommitTimestamp)}
                    </span>
                </span>
            </button>
            {branch.hasWorktree ? (
                <Button
                    aria-label={`Remove ${branch.name} worktree`}
                    className="pointer-events-none absolute top-1/2 right-1 z-[1] h-6 min-w-6 -translate-y-1/2 rounded-md border-transparent bg-sidebar/90 px-0 text-muted-foreground/60 opacity-0 shadow-sm transition-opacity data-[hover=true]:border-transparent data-[hover=true]:bg-sidebar-accent data-[hover=true]:text-sidebar-accent-foreground group-hover/menu-sub-item:pointer-events-auto group-hover/menu-sub-item:opacity-100 group-focus-within/menu-sub-item:pointer-events-auto group-focus-within/menu-sub-item:opacity-100"
                    isDisabled={isRemovingWorktree}
                    isIconOnly
                    size="sm"
                    type="button"
                    onPress={() => void onRemoveWorktree(branch.name)}
                >
                    {isRemovingWorktree ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                    )}
                </Button>
            ) : null}
        </div>
    );
}

function getBranchToneClassName(branch: BranchInfo) {
    if (branch.hasWorktree) {
        return "bg-success/15 text-success";
    }

    if (branch.source === "pull-request") {
        return "bg-blue-500/20 text-blue-600 dark:text-blue-300";
    }

    return "bg-muted/45 text-muted-foreground/75";
}
