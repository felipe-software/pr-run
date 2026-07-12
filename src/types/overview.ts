export type OverviewScope =
    | { type: "all" }
    | { projectId: string; type: "project" };

export type OverviewTotals = {
    additions: number;
    branches: number;
    changedFiles: number;
    deletions: number;
    openPullRequests: number;
    staleBranches: number;
    worktrees: number;
};

export type OverviewProjectSummary = OverviewTotals & {
    projectId: string;
    projectName: string;
};

export type OverviewPullRequestChange = {
    additions: number;
    branchName: string;
    changedFiles: number;
    deletions: number;
    number: number;
    projectId: string;
    projectName: string;
    state: "CLOSED" | "MERGED" | "OPEN";
    title: string;
    updatedAt: string | null;
    url: string;
};

export type OverviewUnavailableProject = {
    message: string;
    projectId: string;
    projectName: string;
};

export type OverviewSnapshot = {
    generatedAt: string;
    projects: OverviewProjectSummary[];
    pullRequests: OverviewPullRequestChange[];
    recentPullRequests: OverviewPullRequestChange[];
    scope: OverviewScope;
    totals: OverviewTotals;
    unavailableProjects: OverviewUnavailableProject[];
};
