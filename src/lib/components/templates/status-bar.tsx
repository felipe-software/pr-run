import { GitBranch, GitPullRequest, Terminal } from "lucide-react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import type { AppStatusSummary } from "@/lib/components/templates/pr-run-app/use-app-status-summary";
import { cn } from "@/lib/utils/cn";

type StatusBarProps = {
    summary: AppStatusSummary;
    onBeginTerminalPanelResize: (
        event: ReactPointerEvent<HTMLDivElement>,
    ) => void;
    onOpenBusyTerminals: () => void;
};

export function StatusBar({
    summary,
    onBeginTerminalPanelResize,
    onOpenBusyTerminals,
}: StatusBarProps) {
    return (
        <footer
            className={cn(
                `border-sidebar-border bg-sidebar text-sidebar-foreground
                relative flex h-7 shrink-0 [scrollbar-width:none] items-center
                gap-1 overflow-x-auto border-t px-2 text-[11px] leading-none
                whitespace-nowrap [&::-webkit-scrollbar]:hidden`,
                summary.isLoadingBranchCounts && "text-muted-foreground",
            )}
            onPointerDown={onBeginTerminalPanelResize}
        >
            <StatusBarItem
                icon={
                    <StatusBarIcon
                        className="bg-warning/15 text-warning-foreground"
                    >
                        <GitBranch className="h-3.5 w-3.5" />
                    </StatusBarIcon>
                }
                label="stale"
                value={summary.staleWorktreeCount}
            />
            <StatusBarItem
                icon={
                    <StatusBarIcon className="bg-success/15 text-success">
                        <Terminal className="h-3.5 w-3.5" />
                    </StatusBarIcon>
                }
                label="busy terminals"
                value={summary.busyTerminalCount}
                onPress={onOpenBusyTerminals}
            />
            <StatusBarItem
                icon={
                    <StatusBarIcon
                        className="bg-blue-500/20 text-blue-600
                            dark:text-blue-300"
                    >
                        <GitPullRequest className="h-3.5 w-3.5" />
                    </StatusBarIcon>
                }
                label="PRs"
                value={summary.openPullRequestCount}
            />
            <StatusBarItem
                icon={
                    <StatusBarIcon className="bg-success/15 text-success">
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
    onPress?: () => void;
    value: number;
};

function StatusBarItem({ icon, label, onPress, value }: StatusBarItemProps) {
    return (
        <button
            className={cn(
                `hover:bg-sidebar-accent focus-visible:ring-ring inline-flex h-6
                min-w-0 cursor-pointer items-center gap-1 rounded bg-transparent
                px-1.5 font-medium transition-colors outline-none
                focus-visible:ring-2`,
            )}
            type="button"
            onPointerDown={(event) => {
                event.stopPropagation();
            }}
            onClick={onPress}
        >
            {icon}
            <span className="tabular-nums">{value}</span>
            <span>{label}</span>
        </button>
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
                "grid h-5 w-5 flex-none place-items-center rounded-md",
                className,
            )}
        >
            {children}
        </span>
    );
}
