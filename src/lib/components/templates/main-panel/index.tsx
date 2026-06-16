import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
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
import { CommitHistory } from "@/lib/components/molecules/commit-history";
import { useCommitHistoryQuery } from "@/lib/hooks/query/use-commit-history-query";
import { useProjectBranchesQuery } from "@/lib/hooks/query/use-project-branches-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import {
    getWorktreeOwnerKey,
    useWorktreeTerminalStore,
} from "@/lib/hooks/store/use-worktree-terminal-store";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ProjectConfig } from "@/types/pr-run";

const WorktreeTerminal = lazy(() =>
    import("@/lib/components/molecules/worktree-terminal").then((module) => ({
        default: module.WorktreeTerminal,
    })),
);

const BranchScriptsSection = lazy(() =>
    import("@/lib/components/templates/branch-scripts-section").then(
        (module) => ({ default: module.BranchScriptsSection }),
    ),
);

const BranchDiffPanel = lazy(() =>
    import("@/lib/components/templates/branch-diff-panel").then((module) => ({
        default: module.BranchDiffPanel,
    })),
);

type MainPanelProps = {
    actionError?: string;
    branchName: string | null;
    isCheckingOutWorktree: boolean;
    project: ProjectConfig | null;
    onCheckoutBranch: (projectId: string, branchName: string) => Promise<void>;
    onCreateScript: () => void;
};

export function MainPanel({
    actionError,
    branchName,
    isCheckingOutWorktree,
    project,
    onCheckoutBranch,
    onCreateScript,
}: MainPanelProps) {
    const [activeTab, setActiveTab] = useState<BranchPageTab>("general");
    const selectedKey =
        project && branchName ? `${project.id}:${branchName}` : "";
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
    const commitsQuery = useCommitHistoryQuery(
        project?.id,
        branchName ?? undefined,
        selectedBranch?.compareBranchName,
        Boolean(project && branchName && selectedBranch),
    );
    const isAwaitingBranchPassphrase = isHandledSshPromptError(
        branchesQuery.error,
    );
    const isAwaitingCommitPassphrase = isHandledSshPromptError(
        commitsQuery.error,
    );

    useEffect(() => {
        setActiveTab("general");
    }, [selectedKey]);

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
        if (!isAwaitingCommitPassphrase) {
            return;
        }

        useSshPassphraseStore
            .getState()
            .setRetryAction(() => commitsQuery.refetch().then(() => undefined));
    }, [commitsQuery, isAwaitingCommitPassphrase]);

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

    const commitsError =
        commitsQuery.error && !isAwaitingCommitPassphrase
            ? getErrorMessage(commitsQuery.error)
            : undefined;
    const currentBranch = selectedBranch;
    const worktreeOwnerKey = getWorktreeOwnerKey(
        project.id,
        currentBranch.name,
    );
    async function runScriptCommand({
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

    return (
        <main className="flex h-dvh min-h-0 flex-1 overflow-hidden bg-background px-3 py-3 max-[900px]:px-2 max-[500px]:overflow-y-auto">
            <div className="flex min-h-0 w-full flex-1 flex-col gap-3 max-[500px]:min-h-[500px]">
                <div className="flex shrink-0 flex-col gap-0">
                    <BranchPageTabs
                        activeTab={activeTab}
                        onSelectTab={setActiveTab}
                    />
                    <BranchPageHeader
                        actionError={actionError}
                        branch={selectedBranch}
                        isCheckingOutWorktree={isCheckingOutWorktree}
                        isRefreshingCommits={commitsQuery.isFetching}
                        project={project}
                        onCheckoutBranch={onCheckoutBranch}
                        onReloadCommits={() => void commitsQuery.refetch()}
                    />
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    {activeTab === "general" ? (
                        <section className="flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 overflow-auto">
                                <CommitHistory
                                    commits={commitsQuery.data ?? []}
                                    error={
                                        isAwaitingCommitPassphrase
                                            ? "Waiting for SSH passphrase..."
                                            : commitsError
                                    }
                                    isLoading={commitsQuery.isPending}
                                />
                            </div>
                        </section>
                    ) : activeTab === "run" ? (
                        selectedBranch.hasWorktree ? (
                            <div className="flex min-h-0 flex-1 flex-col gap-4">
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
                                    <BranchScriptsSection
                                        branchName={currentBranch.name}
                                        projectId={project.id}
                                        onCreateScript={onCreateScript}
                                        onRunScriptCommand={runScriptCommand}
                                    />
                                </Suspense>

                                <Suspense
                                    fallback={
                                        <Surface
                                            className="grid h-[min(42vh,360px)] min-h-60 place-items-center overflow-hidden px-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
                                            variant="terminal"
                                        >
                                            <Skeleton className="h-4 w-36" />
                                        </Surface>
                                    }
                                >
                                    <WorktreeTerminal
                                        ownerKey={worktreeOwnerKey}
                                        worktreePath={
                                            currentBranch.worktreePath
                                        }
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
                    ) : (
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
                            <BranchDiffPanel
                                baseBranchName={currentBranch.compareBranchName}
                                branchName={currentBranch.name}
                                projectId={project.id}
                            />
                        </Suspense>
                    )}
                </div>
            </div>
        </main>
    );
}
