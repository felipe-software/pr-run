import { GitBranch, GitPullRequest, Terminal } from "lucide-react";
import type { ReactNode } from "react";

import type { AppStatusSummary } from "@/lib/components/templates/pr-run-app/use-app-status-summary";
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
        <footer
            className={cn(
                `border-sidebar-border bg-sidebar text-sidebar-foreground
                relative flex h-7 shrink-0 [scrollbar-width:none] items-center
                gap-1 overflow-x-auto border-t px-2 text-[11px] leading-none
                whitespace-nowrap [&::-webkit-scrollbar]:hidden`,
                summary.isLoadingBranchCounts && "text-muted-foreground",
            )}
        >
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
                icon={
                    <StatusBarIcon className="text-muted-foreground">
                        <GitBranch className="h-3.5 w-3.5" />
                    </StatusBarIcon>
                }
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
            <span className="tabular-nums">{value}</span>
            <span>{label}</span>
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
                "grid h-4 w-4 flex-none place-items-center",
                className,
            )}
        >
            {children}
        </span>
    );
}
