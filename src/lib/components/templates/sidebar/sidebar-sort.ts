import { getWorktreeOwnerKey } from "@/lib/hooks/store/use-worktree-terminal-store";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

export function sortProjectsByBusyState(
    projects: ProjectConfig[],
    busyProjectIds: Set<string>,
) {
    return stableBusyFirst(projects, (project) =>
        busyProjectIds.has(project.id),
    );
}

export function sortBranchesByLastCommit(branches: BranchInfo[]) {
    return [...branches].sort(
        (left, right) =>
            (right.lastCommitTimestamp ?? 0) - (left.lastCommitTimestamp ?? 0),
    );
}

export function getVisibleSidebarBranches(params: {
    areAllRecentBranchesVisible: boolean;
    areStaleBranchesVisible: boolean;
    branches: BranchInfo[];
    busyOwnerKeys: Set<string>;
    initialVisibleBranchCount: number;
    projectId: string;
}) {
    const busyBranches = params.branches.filter((branch) =>
        params.busyOwnerKeys.has(
            getWorktreeOwnerKey(params.projectId, branch.name),
        ),
    );
    const busyBranchNames = new Set(busyBranches.map((branch) => branch.name));
    const nonBusyBranches = params.branches.filter(
        (branch) => !busyBranchNames.has(branch.name),
    );
    const recentBranches = nonBusyBranches.filter((branch) => !branch.isStale);
    const staleBranches = nonBusyBranches.filter((branch) => branch.isStale);
    const visibleRecentBranches = params.areAllRecentBranchesVisible
        ? recentBranches
        : recentBranches.slice(0, params.initialVisibleBranchCount);

    return {
        hiddenRecentBranchCount: Math.max(
            recentBranches.length - params.initialVisibleBranchCount,
            0,
        ),
        staleBranches,
        visibleBranches: [
            ...busyBranches,
            ...visibleRecentBranches,
            ...(params.areStaleBranchesVisible ? staleBranches : []),
        ],
    };
}

function stableBusyFirst<T>(items: T[], isBusy: (item: T) => boolean) {
    const busyItems: T[] = [];
    const idleItems: T[] = [];

    for (const item of items) {
        if (isBusy(item)) {
            busyItems.push(item);
        } else {
            idleItems.push(item);
        }
    }

    return [...busyItems, ...idleItems];
}
