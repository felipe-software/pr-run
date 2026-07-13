import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { isHandledSshPromptError } from "@/lib/api";
import { useWorktreeTerminalOwner } from "@/lib/components/molecules/worktree-terminal/use-worktree-terminal-owner";
import { createMainPanelRefreshPlan } from "@/lib/components/templates/main-panel/main-panel-refresh";
import type { BranchPageTab } from "@/lib/components/templates/pr-run-app/types";
import { tryPromise } from "@/lib/error";
import { useProjectBranchesQuery } from "@/lib/hooks/query/use-project-branches-query";
import { useWorktreeActivityQuery } from "@/lib/hooks/query/use-worktree-activity-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import {
    getWorktreeOwnerKey,
    useWorktreeTerminalStore,
} from "@/lib/hooks/store/use-worktree-terminal-store";
import { useWorktreeTerminalActions } from "@/lib/hooks/use-worktree-terminal-actions";
import {
    APP_NAVIGATION_EVENT,
    navigateToAppRoute,
    readAppRoute,
} from "@/lib/navigation";
import type { ProjectConfig } from "@/types/pr-run";

export type RunTerminalContext = {
    ownerKey: string;
    worktreePath: string;
};

type UseMainPanelStateParams = {
    branchName: string;
    isTerminalStateSyncPaused: boolean;
    onRunTerminalContextChange: (context: RunTerminalContext | null) => void;
    project: ProjectConfig;
};

export function useMainPanelState({
    branchName,
    isTerminalStateSyncPaused,
    onRunTerminalContextChange,
    project,
}: UseMainPanelStateParams) {
    const [activeTab, setActiveTab] = useState<BranchPageTab>(() => {
        const route = readAppRoute();
        return route.type === "branch"
            ? (route.page ?? "activity")
            : "activity";
    });
    const [isReviewComposerOpen, setIsReviewComposerOpen] = useState(false);
    const [isRefreshingActiveTab, setIsRefreshingActiveTab] = useState(false);
    const queryClient = useQueryClient();
    const { runScriptCommand } = useWorktreeTerminalActions();
    const selectedKey = `${project.id}:${branchName}`;
    const selectedTerminalOwner = useWorktreeTerminalStore(
        (state) => state.owners[selectedKey],
    );
    const branchesQuery = useProjectBranchesQuery(project.id);
    const selectedBranch = useMemo(
        () =>
            (branchesQuery.data ?? []).find(
                (branch) => branch.name === branchName,
            ),
        [branchName, branchesQuery.data],
    );
    const activityQuery = useWorktreeActivityQuery(
        project.id,
        branchName,
        selectedBranch?.compareBranchName,
        selectedBranch?.pullRequest?.number,
        Boolean(
            selectedBranch &&
            (activeTab === "activity" || activeTab === "changes"),
        ),
    );
    const isAwaitingBranchPassphrase = isHandledSshPromptError(
        branchesQuery.error,
    );
    const isAwaitingActivityPassphrase = isHandledSshPromptError(
        activityQuery.error,
    );
    const isRunTabBusy = Boolean(
        selectedTerminalOwner?.tabs.some(
            (tab) => tab.status === "alive" && tab.busyState === "busy",
        ),
    );
    const runTerminalOwnerKey = selectedBranch
        ? getWorktreeOwnerKey(project.id, selectedBranch.name)
        : "";
    const runTerminalWorktreePath = selectedBranch?.worktreePath ?? "";
    const isRunTerminalReady = Boolean(
        activeTab === "run" &&
        selectedBranch?.hasWorktree &&
        runTerminalOwnerKey &&
        runTerminalWorktreePath,
    );
    const runTerminalContext = useMemo<RunTerminalContext | null>(
        () =>
            isRunTerminalReady
                ? {
                      ownerKey: runTerminalOwnerKey,
                      worktreePath: runTerminalWorktreePath,
                  }
                : null,
        [isRunTerminalReady, runTerminalOwnerKey, runTerminalWorktreePath],
    );

    useWorktreeTerminalOwner({
        enabled: isRunTerminalReady,
        ownerKey: runTerminalOwnerKey,
        syncEnabled: !isTerminalStateSyncPaused,
        worktreePath: runTerminalWorktreePath,
    });

    useEffect(() => {
        function handleNavigation() {
            const route = readAppRoute();

            if (
                route.type === "branch" &&
                route.projectId === project.id &&
                route.branchName === branchName
            ) {
                setActiveTab(route.page ?? "activity");
            }
        }

        window.addEventListener("popstate", handleNavigation);
        window.addEventListener(APP_NAVIGATION_EVENT, handleNavigation);
        return () => {
            window.removeEventListener("popstate", handleNavigation);
            window.removeEventListener(APP_NAVIGATION_EVENT, handleNavigation);
        };
    }, [branchName, project.id]);

    useEffect(() => {
        onRunTerminalContextChange(runTerminalContext);
    }, [onRunTerminalContextChange, runTerminalContext]);

    useEffect(() => {
        return () => onRunTerminalContextChange(null);
    }, [onRunTerminalContextChange]);

    useEffect(() => {
        if (!isAwaitingBranchPassphrase) {
            return;
        }

        useSshPassphraseStore
            .getState()
            .setRetryAction("main-panel:branches", () =>
                branchesQuery.refetch().then(() => undefined),
            );
        return () =>
            useSshPassphraseStore
                .getState()
                .setRetryAction("main-panel:branches", null);
    }, [branchesQuery, isAwaitingBranchPassphrase]);

    useEffect(() => {
        if (!isAwaitingActivityPassphrase) {
            return;
        }

        useSshPassphraseStore
            .getState()
            .setRetryAction("main-panel:activity", () =>
                activityQuery.refetch().then(() => undefined),
            );
        return () =>
            useSshPassphraseStore
                .getState()
                .setRetryAction("main-panel:activity", null);
    }, [activityQuery, isAwaitingActivityPassphrase]);

    async function refreshActiveTab() {
        if (!selectedBranch) {
            return;
        }

        setIsRefreshingActiveTab(true);
        const plan = createMainPanelRefreshPlan({
            activeTab,
            branchName: selectedBranch.name,
            compareBranchName: selectedBranch.compareBranchName,
            projectId: project.id,
            pullRequestNumber: selectedBranch.pullRequest?.number,
        });
        const requests: Promise<unknown>[] = [];

        if (plan.refetchBranches) {
            requests.push(branchesQuery.refetch());
        }

        if (plan.refetchActivity) {
            requests.push(activityQuery.refetch());
        }

        requests.push(
            ...plan.invalidateQueryKeys.map((queryKey) =>
                queryClient.invalidateQueries({ queryKey }),
            ),
        );

        await tryPromise(Promise.all(requests));
        setIsRefreshingActiveTab(false);
    }

    function selectBranchPage(page: BranchPageTab) {
        if (activeTab === page) {
            return;
        }

        setActiveTab(page);
        navigateToAppRoute({
            branchName: selectedBranch?.name ?? branchName,
            page,
            projectId: project.id,
            type: "branch",
        });
    }

    async function runTerminalCommand({
        command,
        scriptTitle,
    }: {
        command: string;
        scriptTitle: string;
    }) {
        if (!selectedBranch) {
            return;
        }

        await runScriptCommand({
            command,
            ownerKey: getWorktreeOwnerKey(project.id, selectedBranch.name),
            scriptTitle,
            worktreePath: selectedBranch.worktreePath,
        });
    }

    const isRefreshing =
        isRefreshingActiveTab ||
        branchesQuery.isFetching ||
        ((activeTab === "activity" || activeTab === "changes") &&
            activityQuery.isFetching);
    const latestActivityItem = activityQuery.data?.items.at(-1);
    const activityContentVersion = activityQuery.data
        ? [
              activityQuery.data.items.length,
              latestActivityItem?.id ?? "empty",
              activityQuery.data.pendingReview?.id ?? "no-pending-review",
          ].join(":")
        : undefined;

    return {
        activeTab,
        activity: activityQuery.data,
        activityContentVersion,
        activityError: activityQuery.error,
        closeReviewComposer: () => setIsReviewComposerOpen(false),
        isActivityPending: activityQuery.isPending,
        isAwaitingActivityPassphrase,
        isAwaitingBranchPassphrase,
        isBranchesPending: branchesQuery.isPending,
        isRefreshing,
        isReviewComposerOpen,
        isRunTabBusy,
        openReviewComposer: () => {
            selectBranchPage("activity");
            setIsReviewComposerOpen(true);
        },
        refreshActiveTab,
        runTerminalCommand,
        selectBranchPage,
        selectedBranch,
        selectedKey,
    };
}
