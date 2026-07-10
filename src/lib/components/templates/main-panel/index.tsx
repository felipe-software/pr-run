import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { isHandledSshPromptError } from "@/lib/api";
import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { useWorktreeTerminalOwner } from "@/lib/components/molecules/worktree-terminal/use-worktree-terminal-owner";
import { BranchPageHeader } from "@/lib/components/templates/main-panel/branch-page-header";
import {
    BranchPageTabs,
    type BranchPageTab,
} from "@/lib/components/templates/main-panel/branch-page-tabs";
import { BranchEmptyState } from "@/lib/components/templates/main-panel/branch-empty-state";
import {
    MainPanelLoadingState,
    MainPanelState,
} from "@/lib/components/templates/main-panel/main-panel-state";
import { ScrollArea } from "@/lib/components/ui/scroll-area";
import { WorktreeActivity } from "@/lib/components/templates/main-panel/activity";
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
import type { ProjectConfig } from "@/types/pr-run";

const WorktreeRun = lazy(() =>
    import("@/lib/components/templates/main-panel/run").then((module) => ({
        default: module.WorktreeRun,
    })),
);

const WorktreeChanges = lazy(() =>
    import("@/lib/components/templates/main-panel/changes").then((module) => ({
        default: module.WorktreeChanges,
    })),
);

const BranchDockerPanel = lazy(() =>
    import("@/lib/components/templates/branch-docker-panel").then((module) => ({
        default: module.BranchDockerPanel,
    })),
);

const BranchEnvPanel = lazy(() =>
    import("@/lib/components/templates/branch-env-panel").then((module) => ({
        default: module.BranchEnvPanel,
    })),
);

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
    const [activeTab, setActiveTab] = useState<BranchPageTab>("changes");
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
        setActiveTab("changes");
    }, [selectedKey]);

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
            .setRetryAction(() =>
                branchesQuery.refetch().then(() => undefined),
            );
    }, [branchesQuery, isAwaitingBranchPassphrase]);

    useEffect(() => {
        if (!isAwaitingActivityPassphrase) {
            return;
        }

        useSshPassphraseStore
            .getState()
            .setRetryAction(() =>
                activityQuery.refetch().then(() => undefined),
            );
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
        activityQuery.error && !isAwaitingActivityPassphrase
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

    const isRefreshing =
        isRefreshingActiveTab ||
        branchesQuery.isFetching ||
        ((activeTab === "activity" || activeTab === "changes") &&
            activityQuery.isFetching);

    return (
        <main
            className={cn(
                `bg-background flex min-h-0 overflow-hidden px-3 py-3
                max-[900px]:px-2 max-[500px]:overflow-y-auto`,
                isRunTerminalDocked ? "shrink-0" : "h-full flex-1",
            )}
        >
            <div
                className="flex min-h-0 w-full flex-1 flex-col gap-3
                    max-[500px]:min-h-[500px]"
            >
                <div className="flex shrink-0 flex-col gap-0">
                    <BranchPageHeader
                        actionError={actionError}
                        branch={selectedBranch}
                        isCheckingOutWorktree={isCheckingOutWorktree}
                        isRefreshing={isRefreshing}
                        project={project}
                        onCheckoutBranch={onCheckoutBranch}
                        onRefresh={refreshActiveTab}
                    />
                    <BranchPageTabs
                        activeTab={activeTab}
                        isRunTabBusy={isRunTabBusy}
                        onSelectTab={setActiveTab}
                    />
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    {activeTab === "activity" ? (
                        <section className="flex min-h-0 flex-1 flex-col">
                            <ScrollArea
                                className="min-h-0 flex-1"
                                hideScrollbars
                                scrollFade
                            >
                                <WorktreeActivity
                                    baseBranchName={
                                        currentBranch.compareBranchName
                                    }
                                    branchName={currentBranch.name}
                                    data={activityQuery.data}
                                    error={
                                        isAwaitingActivityPassphrase
                                            ? "Waiting for SSH passphrase..."
                                            : activityError
                                    }
                                    isLoading={activityQuery.isPending}
                                    projectId={project.id}
                                    pullRequestNumber={
                                        currentBranch.pullRequest?.number
                                    }
                                />
                            </ScrollArea>
                        </section>
                    ) : activeTab === "run" ? (
                        selectedBranch.hasWorktree ? (
                            <div className="flex min-h-0 flex-1 flex-col">
                                <Suspense
                                    fallback={
                                        <Surface
                                            className="grid gap-2 px-3 py-2"
                                            variant="muted"
                                        >
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-7 w-full" />
                                        </Surface>
                                    }
                                >
                                    <WorktreeRun
                                        branchName={currentBranch.name}
                                        projectId={project.id}
                                        onCreateScript={onCreateScript}
                                        onRunScriptCommand={runTerminalCommand}
                                    />
                                </Suspense>
                            </div>
                        ) : (
                            <Surface className="min-h-48" variant="muted">
                                <EmptyState
                                    description="Create the worktree before running project scripts in a terminal."
                                    title="No worktree available"
                                />
                            </Surface>
                        )
                    ) : activeTab === "changes" ? (
                        <Suspense
                            fallback={
                                <Surface
                                    className="grid gap-2 px-3 py-3"
                                    variant="muted"
                                >
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-40 w-full" />
                                </Surface>
                            }
                        >
                            <WorktreeChanges
                                activity={activityQuery.data}
                                baseBranchName={currentBranch.compareBranchName}
                                branchName={currentBranch.name}
                                projectId={project.id}
                                pullRequestNumber={
                                    currentBranch.pullRequest?.number
                                }
                            />
                        </Suspense>
                    ) : activeTab === "docker" ? (
                        selectedBranch.hasWorktree ? (
                            <Suspense
                                fallback={
                                    <Surface
                                        className="grid gap-2 px-3 py-3"
                                        variant="muted"
                                    >
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-16 w-full" />
                                        <Skeleton className="h-20 w-full" />
                                    </Surface>
                                }
                            >
                                <BranchDockerPanel
                                    branchName={currentBranch.name}
                                    projectId={project.id}
                                    onRunDockerCommand={runTerminalCommand}
                                />
                            </Suspense>
                        ) : (
                            <Surface className="min-h-48" variant="muted">
                                <EmptyState
                                    description="Create the worktree before running Docker Compose commands for this branch."
                                    title="No worktree available"
                                />
                            </Surface>
                        )
                    ) : selectedBranch.hasWorktree ? (
                        <Suspense
                            fallback={
                                <Surface
                                    className="grid gap-2 px-3 py-3"
                                    variant="muted"
                                >
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-20 w-full" />
                                </Surface>
                            }
                        >
                            <BranchEnvPanel
                                branchName={currentBranch.name}
                                projectId={project.id}
                            />
                        </Suspense>
                    ) : (
                        <Surface className="min-h-48" variant="muted">
                            <EmptyState
                                description="Create the worktree before reading env files for this branch."
                                title="No worktree available"
                            />
                        </Surface>
                    )}
                </div>
            </div>
        </main>
    );
}
