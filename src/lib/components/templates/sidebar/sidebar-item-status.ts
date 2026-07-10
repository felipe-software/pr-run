import type { BranchInfo, PullRequestInfo } from "@/types/pr-run";

export type SidebarItemStatus =
    | "draft"
    | "open"
    | "closed"
    | "merged"
    | "stale"
    | "branch";

type SidebarItemStatusConfig = {
    description: string;
    label: string;
    pillClassName: string;
    status: SidebarItemStatus;
};

const sidebarItemStatusConfigs: Record<
    SidebarItemStatus,
    SidebarItemStatusConfig
> = {
    draft: {
        description: "This pull request is a draft.",
        label: "Draft",
        pillClassName: "border-border bg-muted/35 text-muted-foreground",
        status: "draft",
    },
    open: {
        description: "This pull request is open.",
        label: "Open",
        pillClassName:
            "border-success/25 bg-success/10 text-success-foreground",
        status: "open",
    },
    closed: {
        description: "This pull request is closed.",
        label: "Closed",
        pillClassName: "border-danger/25 bg-danger/12 text-danger-foreground",
        status: "closed",
    },
    merged: {
        description: "This pull request was merged.",
        label: "Merged",
        pillClassName:
            "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
        status: "merged",
    },
    stale: {
        description: "This branch has no recent activity.",
        label: "Stale",
        pillClassName:
            "border-warning/25 bg-warning/10 text-warning-foreground",
        status: "stale",
    },
    branch: {
        description: "This is a remote branch.",
        label: "Branch",
        pillClassName: "border-border bg-muted/35 text-muted-foreground",
        status: "branch",
    },
};

export function getSidebarItemStatus(branch: BranchInfo) {
    if (branch.pullRequest) {
        return getPullRequestSidebarStatus(branch.pullRequest);
    }

    if (branch.isStale) {
        return sidebarItemStatusConfigs.stale;
    }

    return sidebarItemStatusConfigs.branch;
}

export function getPullRequestSidebarStatus(pullRequest: PullRequestInfo) {
    if (pullRequest.state === "OPEN") {
        return pullRequest.isDraft
            ? sidebarItemStatusConfigs.draft
            : sidebarItemStatusConfigs.open;
    }

    return pullRequest.state === "MERGED"
        ? sidebarItemStatusConfigs.merged
        : sidebarItemStatusConfigs.closed;
}
