import { FolderPlus, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { StatusPill } from "@/lib/components/atoms/status-pill";
import { formatBranchAge } from "@/lib/format";
import { SidebarItemIcon } from "@/lib/components/templates/sidebar/sidebar-item-icon";
import { getSidebarItemStatus } from "@/lib/components/templates/sidebar/sidebar-item-status";
import { cn } from "@/lib/utils/cn";
import type { BranchInfo } from "@/types/pr-run";

type SidebarBranchItemProps = {
    branch: BranchInfo;
    isCheckingOutWorktree: boolean;
    isRemovingWorktree: boolean;
    isSelected: boolean;
    onCheckoutBranch: (branchName: string) => Promise<void>;
    onRemoveWorktree: (branchName: string) => Promise<void>;
    onSelectBranch: (branchName: string) => void;
};

export function SidebarBranchItem({
    branch,
    isCheckingOutWorktree,
    isRemovingWorktree,
    isSelected,
    onCheckoutBranch,
    onRemoveWorktree,
    onSelectBranch,
}: SidebarBranchItemProps) {
    const status = getSidebarItemStatus(branch);
    const isActionPending = isCheckingOutWorktree || isRemovingWorktree;

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
                    <StatusPill className={status.pillClassName} tone="custom">
                        {status.label}
                    </StatusPill>
                    <span
                        className={cn(
                            `text-muted-foreground/70 pointer-events-none w-7
                            shrink-0 text-right text-[10px] leading-4
                            tabular-nums transition-opacity duration-150
                            group-focus-within/menu-sub-item:opacity-0
                            group-hover/menu-sub-item:opacity-0`,
                            isActionPending && "opacity-0",
                        )}
                    >
                        {formatBranchAge(branch.lastCommitTimestamp)}
                    </span>
                </span>
            </button>
            <div
                className={cn(
                    `pointer-events-none absolute inset-y-0 right-0 flex w-7
                    items-center justify-center opacity-0 transition-opacity
                    duration-150
                    group-focus-within/menu-sub-item:pointer-events-auto
                    group-focus-within/menu-sub-item:opacity-100
                    group-hover/menu-sub-item:pointer-events-auto
                    group-hover/menu-sub-item:opacity-100`,
                    isActionPending && "pointer-events-auto opacity-100",
                )}
            >
                {branch.hasWorktree ? (
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
                ) : (
                    <Button
                        aria-label={`Create ${branch.name} worktree`}
                        className="text-danger-foreground
                            data-[hover=true]:bg-sidebar-accent
                            border-transparent bg-transparent shadow-none"
                        isDisabled={isCheckingOutWorktree}
                        isIconOnly
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                        onPress={() => {
                            onCheckoutBranch(branch.name);
                        }}
                    >
                        {isCheckingOutWorktree ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <FolderPlus className="h-3.5 w-3.5" />
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
}
