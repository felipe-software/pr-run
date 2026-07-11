import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import { projectBranchesQueryOptions } from "@/lib/hooks/query/use-project-branches-query";
import { useIsRefreshingCachedData } from "@/lib/hooks/query/use-is-refreshing-cached-data";
import {
    getBusyTerminalSummary,
    useWorktreeTerminalStore,
} from "@/lib/hooks/store/use-worktree-terminal-store";
import type { ProjectConfig } from "@/types/pr-run";

export type AppStatusSummary = {
    branchCount: number;
    busyOwnerKeys: Set<string>;
    busyProjectIds: Set<string>;
    busyTerminalCount: number;
    isLoadingBranchCounts: boolean;
    isRefreshingCachedData: boolean;
    openPullRequestCount: number;
    staleWorktreeCount: number;
    worktreeCount: number;
};

export function useAppStatusSummary(
    projects: ProjectConfig[],
): AppStatusSummary {
    const owners = useWorktreeTerminalStore((state) => state.owners);
    const isRefreshingCachedData = useIsRefreshingCachedData();
    const branchQueries = useQueries({
        queries: projects.map((project) => ({
            ...projectBranchesQueryOptions(project.id),
            enabled: projects.length > 0,
        })),
    });

    const busySummary = useMemo(() => getBusyTerminalSummary(owners), [owners]);

    return useMemo(() => {
        let branchCount = 0;
        let openPullRequestCount = 0;
        let staleWorktreeCount = 0;
        let worktreeCount = 0;

        for (const query of branchQueries) {
            for (const branch of query.data ?? []) {
                if (branch.source === "branch") {
                    branchCount += 1;
                }

                if (branch.pullRequest?.state === "OPEN") {
                    openPullRequestCount += 1;
                }

                if (branch.hasWorktree) {
                    worktreeCount += 1;
                }

                if (branch.hasWorktree && branch.isStale) {
                    staleWorktreeCount += 1;
                }
            }
        }

        return {
            ...busySummary,
            branchCount,
            isLoadingBranchCounts: branchQueries.some(
                (query) => query.isPending,
            ),
            isRefreshingCachedData,
            openPullRequestCount,
            staleWorktreeCount,
            worktreeCount,
        };
    }, [branchQueries, busySummary, isRefreshingCachedData]);
}
