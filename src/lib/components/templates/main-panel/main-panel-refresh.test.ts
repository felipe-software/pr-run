import { describe, expect, test } from "vitest";

import { createMainPanelRefreshPlan } from "@/lib/components/templates/main-panel/main-panel-refresh";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";
import type { BranchPageTab } from "@/lib/components/templates/pr-run-app/types";

const identifiers = {
    branchName: "feature/main-panel",
    compareBranchName: "main",
    projectId: "project-1",
    pullRequestNumber: 42,
};

describe("createMainPanelRefreshPlan", () => {
    test.each<{
        activeTab: BranchPageTab;
        invalidateQueryKeys: readonly (readonly unknown[])[];
        refetchActivity: boolean;
    }>([
        {
            activeTab: "activity",
            invalidateQueryKeys: [],
            refetchActivity: true,
        },
        {
            activeTab: "changes",
            invalidateQueryKeys: [
                prRunQueryKeys.diff(
                    identifiers.projectId,
                    identifiers.branchName,
                    identifiers.compareBranchName,
                    identifiers.pullRequestNumber,
                ),
            ],
            refetchActivity: true,
        },
        {
            activeTab: "run",
            invalidateQueryKeys: [
                prRunQueryKeys.packageScripts(
                    identifiers.projectId,
                    identifiers.branchName,
                ),
                prRunQueryKeys.scripts,
            ],
            refetchActivity: false,
        },
        {
            activeTab: "docker",
            invalidateQueryKeys: [
                prRunQueryKeys.docker(
                    identifiers.projectId,
                    identifiers.branchName,
                ),
            ],
            refetchActivity: false,
        },
        {
            activeTab: "env",
            invalidateQueryKeys: [
                prRunQueryKeys.env(
                    identifiers.projectId,
                    identifiers.branchName,
                ),
            ],
            refetchActivity: false,
        },
    ])(
        "plans the $activeTab refresh without unrelated queries",
        ({ activeTab, invalidateQueryKeys, refetchActivity }) => {
            expect(
                createMainPanelRefreshPlan({ activeTab, ...identifiers }),
            ).toEqual({
                invalidateQueryKeys,
                refetchActivity,
                refetchBranches: true,
            });
        },
    );
});
