import { GitBranch, GitPullRequest, RefreshCw, Terminal } from "lucide-react";
import type { ReactNode } from "react";

import { WorktreeIndicator } from "@/lib/components/atoms/worktree-indicator";
import type { AppStatusSummary } from "@/lib/components/templates/pr-run-app/use-app-status-summary";
import { ScrollArea } from "@/lib/components/ui/scroll-area";
import {
    Tooltip,
    TooltipPopup,
    TooltipTrigger,
} from "@/lib/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

type StatusBarProps = {
    summary: AppStatusSummary;
    onOpenBusyTerminals: () => void;
};

export function StatusBar({ summary, onOpenBusyTerminals }: StatusBarProps) {
    return (
        <ScrollArea
            className={cn(
                `border-sidebar-border bg-sidebar text-sidebar-foreground
                relative h-7 shrink-0 border-t text-[11px] leading-none`,
                summary.isLoadingBranchCounts && "text-muted-foreground",
            )}
            hideScrollbars
            scrollFade
        >
            <footer
                className="flex h-full w-max min-w-full items-center gap-1 px-2
                    whitespace-nowrap"
            >
                {summary.isRefreshingCachedData ? (
                    <span
                        className="text-muted-foreground inline-flex h-6
                            items-center gap-1 px-1.5"
                    >
                        <RefreshCw className="size-3 animate-spin" />
                        Refreshing cached data…
                    </span>
                ) : null}
                <StatusBarItem
                    icon={
                        <StatusBarIcon className="text-warning">
                            <GitBranch className="h-3.5 w-3.5" />
                        </StatusBarIcon>
                    }
                    label="stale"
                    value={summary.staleWorktreeCount}
                />
                <StatusBarItem
                    icon={
                        <StatusBarIcon className="text-success">
                            <Terminal className="h-3.5 w-3.5" />
                        </StatusBarIcon>
                    }
                    label="busy terminals"
                    value={summary.busyTerminalCount}
                    onClick={onOpenBusyTerminals}
                />
                <StatusBarItem
                    icon={
                        <StatusBarIcon className="text-muted-foreground">
                            <GitPullRequest className="h-3.5 w-3.5" />
                        </StatusBarIcon>
                    }
                    label="PRs"
                    value={summary.openPullRequestCount}
                />
                <StatusBarItem
                    icon={<WorktreeIndicator aria-hidden="true" />}
                    label="worktrees"
                    value={summary.worktreeCount}
                />
                <StatusBarItem
                    icon={
                        <StatusBarIcon
                            className="bg-muted/45 text-muted-foreground/75"
                        >
                            <GitBranch className="h-3.5 w-3.5" />
                        </StatusBarIcon>
                    }
                    label="branches"
                    value={summary.branchCount}
                />
            </footer>
        </ScrollArea>
    );
}

type StatusBarItemProps = {
    icon: ReactNode;
    label: string;
    onClick?: () => void;
    value: number;
};

function StatusBarItem({ icon, label, onClick, value }: StatusBarItemProps) {
    const content = (
        <>
            {icon}
            <span className="inline-flex items-center gap-0.5">
                <span className="tabular-nums">{value}</span>
                <span>{label}</span>
            </span>
        </>
    );

    if (!onClick) {
        return (
            <span
                className="text-muted-foreground inline-flex h-6 items-center
                    gap-1 px-1.5"
            >
                {content}
            </span>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <button
                        className={cn(
                            `hover:bg-sidebar-accent focus-visible:ring-ring
                            inline-flex h-6 min-w-0 cursor-pointer items-center
                            gap-1 rounded bg-transparent px-1.5 font-medium
                            transition-colors outline-none focus-visible:ring-2`,
                        )}
                        type="button"
                        onPointerDown={(event) => {
                            event.stopPropagation();
                        }}
                        onClick={onClick}
                    >
                        {content}
                    </button>
                }
            >
                {content}
            </TooltipTrigger>
            <TooltipPopup>Open busy terminals</TooltipPopup>
        </Tooltip>
    );
}

function StatusBarIcon({
    children,
    className,
}: {
    children: ReactNode;
    className: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex h-4 w-4 flex-none items-center justify-center",
                className,
            )}
        >
            {children}
        </span>
    );
}
