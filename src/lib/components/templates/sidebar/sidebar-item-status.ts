import type { BranchInfo } from "@/types/pr-run";

export type SidebarItemStatus =
    | "stale-worktree"
    | "worktree"
    | "stale"
    | "pull-request"
    | "branch";

type SidebarItemStatusConfig = {
    iconClassName: string;
    label: string;
    pillClassName: string;
    status: SidebarItemStatus;
};

const sidebarItemStatusConfigs: Record<
    SidebarItemStatus,
    SidebarItemStatusConfig
> = {
    "stale-worktree": {
        iconClassName: "bg-danger/15 text-danger-foreground",
        label: "Stale Worktree",
        pillClassName: "border-danger/25 bg-danger/15 text-danger-foreground",
        status: "stale-worktree",
    },
    worktree: {
        iconClassName: "bg-success/15 text-success",
        label: "Worktree",
        pillClassName:
            "border-success/25 bg-success/10 text-success-foreground",
        status: "worktree",
    },
    stale: {
        iconClassName: "bg-warning/15 text-warning-foreground",
        label: "Stale",
        pillClassName:
            "border-warning/25 bg-warning/10 text-warning-foreground",
        status: "stale",
    },
    "pull-request": {
        iconClassName: "bg-blue-500/20 text-blue-600 dark:text-blue-300",
        label: "PR",
        pillClassName:
            "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        status: "pull-request",
    },
    branch: {
        iconClassName: "bg-muted/45 text-muted-foreground/75",
        label: "Branch",
        pillClassName: "border-border bg-muted/35 text-muted-foreground",
        status: "branch",
    },
};

export function getSidebarItemStatus(branch: BranchInfo) {
    if (branch.hasWorktree && branch.isStale) {
        return sidebarItemStatusConfigs["stale-worktree"];
    }

    if (branch.hasWorktree) {
        return sidebarItemStatusConfigs.worktree;
    }

    if (branch.isStale) {
        return sidebarItemStatusConfigs.stale;
    }

    if (branch.source === "pull-request") {
        return sidebarItemStatusConfigs["pull-request"];
    }

    return sidebarItemStatusConfigs.branch;
}
