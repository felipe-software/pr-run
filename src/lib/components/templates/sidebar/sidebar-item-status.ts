import type { BranchInfo } from "@/types/pr-run";

export type SidebarItemStatus =
    | "stale-worktree"
    | "worktree"
    | "stale"
    | "pull-request"
    | "branch";

type SidebarItemStatusConfig = {
    label: string;
    pillClassName: string;
    status: SidebarItemStatus;
};

const sidebarItemStatusConfigs: Record<
    SidebarItemStatus,
    SidebarItemStatusConfig
> = {
    "stale-worktree": {
        label: "Stale Worktree",
        pillClassName: "border-danger/25 bg-danger/15 text-danger-foreground",
        status: "stale-worktree",
    },
    worktree: {
        label: "Worktree",
        pillClassName:
            "border-success/25 bg-success/10 text-success-foreground",
        status: "worktree",
    },
    stale: {
        label: "Stale",
        pillClassName:
            "border-warning/25 bg-warning/10 text-warning-foreground",
        status: "stale",
    },
    "pull-request": {
        label: "PR",
        pillClassName:
            "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        status: "pull-request",
    },
    branch: {
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
