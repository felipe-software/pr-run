import { RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { StatusPill } from "@/lib/components/atoms/status-pill";
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
    const status = getBranchStatus(branch);

    return (
        <div
            className={cn(
                "group/menu-sub-item relative flex min-w-0 rounded-md",
                isSelected && "bg-sidebar-accent",
            )}
        >
            <button
                aria-selected={isSelected}
                className={cn(
                    `text-sidebar-foreground hover:bg-sidebar-accent
                    hover:text-sidebar-accent-foreground focus-visible:ring-ring
                    active:bg-sidebar-accent flex min-w-0 flex-1 grow
                    cursor-pointer items-center gap-2 overflow-hidden rounded-md
                    bg-transparent px-1.5 py-1.5 text-left transition-colors
                    outline-none focus-visible:ring-2`,
                    isSelected && "text-sidebar-accent-foreground",
                    branch.isStale && !isSelected && "text-muted-foreground",
                )}
                type="button"
                onClick={() => onSelectBranch(branch.name)}
            >
                <SidebarItemIcon branch={branch} />
                <span
                    className="min-w-0 flex-1 grow truncate text-[13px]
                        leading-4 tracking-tight"
                >
                    {branch.name}
                </span>
                <span
                    className="ml-auto flex shrink-0 items-center justify-end
                        gap-0 text-right"
                >
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    <span
                        className="text-muted-foreground/70 min-w-5 shrink-0
                            text-right text-[10px] leading-4 tabular-nums"
                    >
                        {formatBranchAge(branch.lastCommitTimestamp)}
                    </span>
                </span>
            </button>
            {branch.hasWorktree ? (
                <div
                    className="bg-sidebar/80 pointer-events-none absolute
                        inset-y-0 right-0 flex items-center rounded-r-md px-1
                        opacity-0 backdrop-blur-md transition-opacity
                        duration-150
                        group-[&:is(:hover,:focus-within)]/menu-sub-item:pointer-events-auto
                        group-[&:is(:hover,:focus-within)]/menu-sub-item:opacity-100"
                >
                    <Button
                        aria-label={`Remove ${branch.name} worktree`}
                        className="text-danger-foreground
                            data-[hover=true]:bg-sidebar-accent
                            border-transparent bg-transparent shadow-none"
                        isDisabled={isRemovingWorktree}
                        isIconOnly
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                        onPress={() => {
                            onRemoveWorktree(branch.name);
                        }}
                    >
                        {isRemovingWorktree ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                        )}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}

function getBranchStatus(branch: BranchInfo): {
    label: string;
    tone: "branch" | "pull-request" | "stale" | "worktree";
} {
    if (branch.hasWorktree && branch.isStale) {
        return { label: "Stale Worktree", tone: "stale" };
    }

    if (branch.hasWorktree) {
        return { label: "Worktree", tone: "worktree" };
    }

    if (branch.isStale) {
        return { label: "Stale", tone: "stale" };
    }

    if (branch.source === "pull-request") {
        return { label: "PR", tone: "pull-request" };
    }

    return { label: "Branch", tone: "branch" };
}
