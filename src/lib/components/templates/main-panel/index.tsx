import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { isHandledSshPromptError } from "@/lib/api";
import { useWorktreeTerminalOwner } from "@/lib/components/molecules/worktree-terminal/use-worktree-terminal-owner";
import { BranchPageContent } from "@/lib/components/templates/main-panel/branch-page-content";
import { BranchPageHeader } from "@/lib/components/templates/main-panel/branch-page-header";
import {
    BranchPageTabs,
    type BranchPageTab,
} from "@/lib/components/templates/main-panel/branch-page-tabs";
import { BranchEmptyState } from "@/lib/components/templates/main-panel/branch-empty-state";
import { BranchPageLayout } from "@/lib/components/templates/main-panel/branch-page-layout";
import {
    MainPanelLoadingState,
    MainPanelState,
} from "@/lib/components/templates/main-panel/main-panel-state";
import { useWorktreeActivityQuery } from "@/lib/hooks/query/use-worktree-activity-query";
import { useProjectBranchesQuery } from "@/lib/hooks/query/use-project-branches-query";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import {
    getWorktreeOwnerKey,
    useWorktreeTerminalStore,
} from "@/lib/hooks/store/use-worktree-terminal-store";
import { cn } from "@/lib/utils/cn";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { tryPromise } from "@/lib/error";
import {
    APP_NAVIGATION_EVENT,
    navigateToAppRoute,
    readAppRoute,
} from "@/lib/navigation";
import type { ProjectConfig } from "@/types/pr-run";

type MainPanelProps = {
    actionError?: string;
    branchName: string | null;
    isRunTerminalDocked: boolean;
    isTerminalStateSyncPaused: boolean;
    isCheckingOutWorktree: boolean;
    project: ProjectConfig | null;
    onCheckoutBranch: (projectId: string, branchName: string) => Promise<void>;
    onCreateScript: () => void;
    onRunTerminalContextChange: (context: RunTerminalContext | null) => void;
};

export type RunTerminalContext = {
    ownerKey: string;
    worktreePath: string;
};

export function MainPanel({
    actionError,
    branchName,
    isRunTerminalDocked,
    isTerminalStateSyncPaused,
    isCheckingOutWorktree,
    project,
    onCheckoutBranch,
    onCreateScript,
    onRunTerminalContextChange,
}: MainPanelProps) {
    const [activeTab, setActiveTab] = useState<BranchPageTab>(() => {
        const route = readAppRoute();
        return route.type === "branch"
            ? (route.page ?? "activity")
            : "activity";
    });
    const [isReviewComposerOpen, setIsReviewComposerOpen] = useState(false);
    const [isRefreshingActiveTab, setIsRefreshingActiveTab] = useState(false);
    const queryClient = useQueryClient();
    const selectedKey =
        project && branchName ? `${project.id}:${branchName}` : "";
    const selectedTerminalOwner = useWorktreeTerminalStore((state) =>
        selectedKey ? state.owners[selectedKey] : undefined,
    );
    const branchesQuery = useProjectBranchesQuery(
        project?.id,
        Boolean(project),
    );
    const selectedBranch = useMemo(
        () =>
            (branchesQuery.data ?? []).find(
                (branch) => branch.name === branchName,
            ),
        [branchName, branchesQuery.data],
    );
    const activityQuery = useWorktreeActivityQuery(
        project?.id,
        branchName ?? undefined,
        selectedBranch?.compareBranchName,
        selectedBranch?.pullRequest?.number,
        Boolean(
            project &&
            branchName &&
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
    const runTerminalOwnerKey =
        project && selectedBranch
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
        const route = readAppRoute();
        setActiveTab(
            route.type === "branch" &&
                route.projectId === project?.id &&
                route.branchName === branchName
                ? (route.page ?? "activity")
                : "activity",
        );
        setIsReviewComposerOpen(false);
    }, [branchName, project?.id, selectedKey]);

    useEffect(() => {
        function handlePopState() {
            const route = readAppRoute();

            if (
                route.type === "branch" &&
                route.projectId === project?.id &&
                route.branchName === branchName
            ) {
                setActiveTab(route.page ?? "activity");
            }
        }

        window.addEventListener("popstate", handlePopState);
        window.addEventListener(APP_NAVIGATION_EVENT, handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
            window.removeEventListener(APP_NAVIGATION_EVENT, handlePopState);
        };
    }, [branchName, project?.id]);

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

    if (!project || !branchName) {
        return <BranchEmptyState />;
    }

    if (branchesQuery.isPending && !selectedBranch) {
        return (
            <MainPanelLoadingState>
                Loading branch details...
            </MainPanelLoadingState>
        );
    }

    if (isAwaitingBranchPassphrase) {
        return <MainPanelState>Waiting for SSH passphrase...</MainPanelState>;
    }

    if (!selectedBranch) {
        return (
            <MainPanelState tone="danger">
                This branch is no longer available.
            </MainPanelState>
        );
    }

    const activityError =
        activityQuery.error &&
        !activityQuery.data &&
        !isAwaitingActivityPassphrase
            ? getErrorMessage(activityQuery.error)
            : undefined;
    const currentBranch = selectedBranch;
    const currentProjectId = project.id;
    const worktreeOwnerKey = getWorktreeOwnerKey(
        project.id,
        currentBranch.name,
    );
    async function runTerminalCommand({
        command,
        scriptTitle,
    }: {
        command: string;
        scriptTitle: string;
    }) {
        await useWorktreeTerminalStore.getState().runScriptCommand({
            command,
            ownerKey: worktreeOwnerKey,
            scriptTitle,
            worktreePath: currentBranch.worktreePath,
        });
    }

    async function refreshActiveTab() {
        setIsRefreshingActiveTab(true);
        const requests: Promise<unknown>[] = [branchesQuery.refetch()];

        if (activeTab === "activity" || activeTab === "changes") {
            requests.push(activityQuery.refetch());
        }

        if (activeTab === "changes") {
            requests.push(
                queryClient.invalidateQueries({
                    queryKey: prRunQueryKeys.diff(
                        currentProjectId,
                        currentBranch.name,
                        currentBranch.compareBranchName ?? "default",
                        currentBranch.pullRequest?.number,
                    ),
                }),
            );
        } else if (activeTab === "run") {
            requests.push(
                queryClient.invalidateQueries({
                    queryKey: prRunQueryKeys.packageScripts(
                        currentProjectId,
                        currentBranch.name,
                    ),
                }),
                queryClient.invalidateQueries({
                    queryKey: prRunQueryKeys.scripts,
                }),
            );
        } else if (activeTab === "docker") {
            requests.push(
                queryClient.invalidateQueries({
                    queryKey: prRunQueryKeys.docker(
                        currentProjectId,
                        currentBranch.name,
                    ),
                }),
            );
        } else if (activeTab === "env") {
            requests.push(
                queryClient.invalidateQueries({
                    queryKey: prRunQueryKeys.env(
                        currentProjectId,
                        currentBranch.name,
                    ),
                }),
            );
        }

        await tryPromise(Promise.all(requests));
        setIsRefreshingActiveTab(false);
    }

    function selectBranchPage(page: BranchPageTab) {
        setActiveTab(page);

        if (activeTab === page) {
            return;
        }

        navigateToAppRoute({
            branchName: currentBranch.name,
            page,
            projectId: currentProjectId,
            type: "branch",
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

    return (
        <main
            className={cn(
                `bg-background flex min-h-0 overflow-hidden px-3 py-3
                max-[900px]:px-2`,
                isRunTerminalDocked ? "shrink-0" : "h-full flex-1",
                activeTab !== "activity" && "max-[500px]:overflow-y-auto",
            )}
        >
            <BranchPageLayout
                contentVersion={activityContentVersion}
                isHeaderCompactable={
                    activeTab === "activity" || activeTab === "changes"
                }
                isReading={activeTab === "activity"}
                isReadingReady={!activityQuery.isPending}
                renderHeader={(isCompact) => (
                    <BranchPageHeader
                        actionError={actionError}
                        branch={selectedBranch}
                        isCheckingOutWorktree={isCheckingOutWorktree}
                        isCompact={isCompact}
                        isRefreshing={isRefreshing}
                        project={project}
                        onCheckoutBranch={onCheckoutBranch}
                        onOpenReview={() => {
                            selectBranchPage("activity");
                            setIsReviewComposerOpen(true);
                        }}
                        onRefresh={refreshActiveTab}
                    />
                )}
                scrollKey={selectedKey}
                tabs={
                    <BranchPageTabs
                        activeTab={activeTab}
                        isRunTabBusy={isRunTabBusy}
                        onSelectTab={selectBranchPage}
                    />
                }
            >
                <BranchPageContent
                    activeTab={activeTab}
                    activity={activityQuery.data}
                    activityError={activityError}
                    branch={currentBranch}
                    isActivityLoading={activityQuery.isPending}
                    isAwaitingActivityPassphrase={isAwaitingActivityPassphrase}
                    isReviewComposerOpen={isReviewComposerOpen}
                    project={project}
                    onCloseReview={() => setIsReviewComposerOpen(false)}
                    onCreateScript={onCreateScript}
                    onRunTerminalCommand={runTerminalCommand}
                />
            </BranchPageLayout>
        </main>
    );
}
