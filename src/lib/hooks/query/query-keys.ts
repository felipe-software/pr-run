export const prRunQueryKeys = {
    config: ["pr-run", "config"] as const,
    scripts: ["pr-run", "scripts"] as const,
    scriptSource: (scriptId: string) =>
        [...prRunQueryKeys.scripts, scriptId, "source"] as const,
    project: (projectId: string) => ["pr-run", "project", projectId] as const,
    branches: (projectId: string) =>
        [...prRunQueryKeys.project(projectId), "branches"] as const,
    commits: (projectId: string, branchName: string, baseBranchName: string) =>
        [
            ...prRunQueryKeys.project(projectId),
            "branch",
            branchName,
            "base",
            baseBranchName,
            "commits",
        ] as const,
    diff: (projectId: string, branchName: string, baseBranchName: string) =>
        [
            ...prRunQueryKeys.project(projectId),
            "branch",
            branchName,
            "base",
            baseBranchName,
            "diff",
        ] as const,
};
