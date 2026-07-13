import type { QueryKey } from "@tanstack/react-query";

import type { BranchPageTab } from "@/lib/components/templates/pr-run-app/types";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

type MainPanelRefreshParams = {
    activeTab: BranchPageTab;
    branchName: string;
    compareBranchName?: string;
    projectId: string;
    pullRequestNumber?: number;
};

export type MainPanelRefreshPlan = {
    invalidateQueryKeys: QueryKey[];
    refetchActivity: boolean;
    refetchBranches: true;
};

export function createMainPanelRefreshPlan({
    activeTab,
    branchName,
    compareBranchName,
    projectId,
    pullRequestNumber,
}: MainPanelRefreshParams): MainPanelRefreshPlan {
    const basePlan = {
        refetchActivity: activeTab === "activity" || activeTab === "changes",
        refetchBranches: true as const,
    };

    if (activeTab === "changes") {
        return {
            ...basePlan,
            invalidateQueryKeys: [
                prRunQueryKeys.diff(
                    projectId,
                    branchName,
                    compareBranchName ?? "default",
                    pullRequestNumber,
                ),
            ],
        };
    }

    if (activeTab === "run") {
        return {
            ...basePlan,
            invalidateQueryKeys: [
                prRunQueryKeys.packageScripts(projectId, branchName),
                prRunQueryKeys.scripts,
            ],
        };
    }

    if (activeTab === "docker") {
        return {
            ...basePlan,
            invalidateQueryKeys: [prRunQueryKeys.docker(projectId, branchName)],
        };
    }

    if (activeTab === "env") {
        return {
            ...basePlan,
            invalidateQueryKeys: [prRunQueryKeys.env(projectId, branchName)],
        };
    }

    return { ...basePlan, invalidateQueryKeys: [] };
}
