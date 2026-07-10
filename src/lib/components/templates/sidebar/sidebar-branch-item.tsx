import { FolderPlus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";

import { BusyIcon } from "@/lib/components/atoms/busy-icon";
import { Button } from "@/lib/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPopup,
    DialogTitle,
} from "@/lib/components/ui/dialog";
import { StatusPill } from "@/lib/components/atoms/status-pill";
import { formatBranchAge } from "@/lib/format";
import {
    SidebarPrAuthorAvatar,
    SidebarPrPeopleTooltip,
} from "@/lib/components/templates/sidebar/sidebar-pr-people-tooltip";
import { getSidebarItemStatus } from "@/lib/components/templates/sidebar/sidebar-item-status";
import { cn } from "@/lib/utils/cn";
import type { BranchInfo } from "@/types/pr-run";

type SidebarBranchItemProps = {
    branch: BranchInfo;
    isBusy: boolean;
    isCollapsedPreview?: boolean;
    isCheckingOutWorktree: boolean;
    isRemovingWorktree: boolean;
    isSelected: boolean;
    onCheckoutBranch: (branchName: string) => Promise<void>;
    onRemoveWorktree: (branchName: string) => Promise<void>;
    onSelectBranch: (branchName: string) => void;
};

export function SidebarBranchItem({
    branch,
    isBusy,
    isCollapsedPreview = false,
    isCheckingOutWorktree,
    isRemovingWorktree,
    isSelected,
    onCheckoutBranch,
    onRemoveWorktree,
    onSelectBranch,
}: SidebarBranchItemProps) {
    const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
    const status = getSidebarItemStatus(branch);
    const isActionPending = isCheckingOutWorktree || isRemovingWorktree;
    const pullRequestAuthor = branch.pullRequest?.author;
    const branchButton = (
        <button
            aria-label={
                pullRequestAuthor
                    ? `Select ${branch.name}, PR by ${pullRequestAuthor.login}, ${status.label}${isBusy ? ", busy terminal" : ""}`
                    : undefined
            }
            aria-selected={isSelected}
            className={cn(
                `text-sidebar-foreground hover:bg-sidebar-accent
                hover:text-sidebar-accent-foreground focus-visible:ring-ring
                active:bg-sidebar-accent flex h-7 min-w-0 flex-1 grow
                cursor-pointer items-center gap-2 overflow-hidden rounded-md
                bg-transparent px-1.5 text-left transition-colors outline-none
                focus-visible:ring-2`,
                isSelected && "text-sidebar-accent-foreground",
                branch.isStale && !isSelected && "text-muted-foreground",
                isCollapsedPreview && "py-1 opacity-85 shadow-none",
            )}
            type="button"
            onClick={() => onSelectBranch(branch.name)}
        >
            {pullRequestAuthor ? (
                <SidebarPrAuthorAvatar user={pullRequestAuthor} />
            ) : null}
            <span
                className="min-w-0 flex-1 grow truncate text-[13px] leading-4
                    tracking-tight"
            >
                {branch.name}
            </span>
            <span
                className="ml-auto flex shrink-0 items-center justify-end gap-0
                    text-right"
            >
                {isBusy ? <BusyIcon className="mr-1" size="sm" /> : null}
                <StatusPill className={status.pillClassName} tone="custom">
                    {status.label}
                </StatusPill>
                <span
                    className={cn(
                        `text-muted-foreground/70 pointer-events-none w-[1.5rem]
                        shrink-0 text-right text-[10px] leading-4 tabular-nums
                        transition-opacity duration-150
                        group-focus-within/menu-sub-item:opacity-0
                        group-hover/menu-sub-item:opacity-0`,
                        isActionPending && "opacity-0",
                    )}
                >
                    {formatBranchAge(branch.lastCommitTimestamp)}
                </span>
            </span>
        </button>
    );

    return (
        <div
            className={cn(
                "group/menu-sub-item relative flex min-w-0 rounded-md",
                isSelected && "bg-sidebar-accent",
            )}
        >
            <svg
                aria-hidden="true"
                className="text-sidebar-border/80 pointer-events-none absolute
                    top-0 -left-4 z-10 h-[15px] w-[22px] overflow-visible"
                fill="none"
                viewBox="0 0 22 15"
            >
                <path
                    d="M0.5 5.5C0.5 10.5 3.5 14.5 9.5 14.5H21.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
            {branch.pullRequest ? (
                <SidebarPrPeopleTooltip pullRequest={branch.pullRequest}>
                    {branchButton}
                </SidebarPrPeopleTooltip>
            ) : (
                branchButton
            )}
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
                        className="text-danger-foreground"
                        disabled={isRemovingWorktree}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                        onClick={() => setIsRemoveConfirmOpen(true)}
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
                        className="text-danger-foreground"
                        disabled={isCheckingOutWorktree}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                        onClick={() => {
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
            <Dialog
                open={isRemoveConfirmOpen}
                onOpenChange={setIsRemoveConfirmOpen}
            >
                <DialogPopup showCloseButton={!isRemovingWorktree}>
                    <DialogHeader>
                        <DialogTitle>Remove worktree</DialogTitle>
                        <DialogDescription>
                            Remove the local worktree for {branch.name}. The
                            remote branch remains available.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            disabled={isRemovingWorktree}
                            variant="ghost"
                            onClick={() => setIsRemoveConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={isRemovingWorktree}
                            variant="destructive"
                            onClick={() => onRemoveWorktree(branch.name)}
                        >
                            {isRemovingWorktree
                                ? "Removing..."
                                : "Remove worktree"}
                        </Button>
                    </DialogFooter>
                </DialogPopup>
            </Dialog>
        </div>
    );
}
