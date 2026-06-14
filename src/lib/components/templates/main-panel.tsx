import { Card, Spinner, Surface } from "@heroui/react";
import { Code2, FolderPlus, RefreshCw } from "lucide-react";
import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { Button } from "@/lib/components/atoms/button";
import { CommitHistory } from "@/lib/components/molecules/commit-history";
import type { WorktreeTerminalHandle } from "@/lib/components/molecules/worktree-terminal";
import { useCommitHistoryQuery } from "@/lib/hooks/query/use-commit-history-query";
import { useProjectBranchesQuery } from "@/lib/hooks/query/use-project-branches-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
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

type BranchPageTab = "general" | "run" | "diff";

export function MainPanel({
    actionError,
    branchName,
    isCheckingOutWorktree,
    project,
    onCheckoutBranch,
    onCreateScript,
}: MainPanelProps) {
    const [activeTab, setActiveTab] = useState<BranchPageTab>("general");
    const terminalRef = useRef<WorktreeTerminalHandle>(null);
    const pendingTerminalCommandsRef = useRef<string[]>([]);
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
        Boolean(project && branchName),
    );
    const setTerminalHandle = useCallback(
        (terminal: WorktreeTerminalHandle | null) => {
            terminalRef.current = terminal;

            if (!terminal) {
                return;
            }

            for (const command of pendingTerminalCommandsRef.current.splice(
                0,
            )) {
                terminal.runCommand(command);
            }
        },
        [],
    );
    const runTerminalCommand = useCallback((command: string) => {
        if (terminalRef.current) {
            terminalRef.current.runCommand(command);
            return;
        }

        pendingTerminalCommandsRef.current.push(command);
    }, []);
    const isAwaitingBranchPassphrase = isHandledSshPromptError(
        branchesQuery.error,
    );
    const isAwaitingCommitPassphrase = isHandledSshPromptError(
        commitsQuery.error,
    );

    useEffect(() => {
        setActiveTab("general");
        pendingTerminalCommandsRef.current = [];
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
        return (
            <main className="flex h-screen min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background p-8">
                <Card className="max-w-md rounded-lg text-center">
                    <Card.Content className="p-8">
                        <Code2 className="mx-auto h-8 w-8 text-muted-foreground" />
                        <Card.Title className="mt-4">
                            Select a branch
                        </Card.Title>
                        <Card.Description>
                            Pick a project in the sidebar and click a remote
                            branch to inspect it.
                        </Card.Description>
                    </Card.Content>
                </Card>
            </main>
        );
    }

    if (branchesQuery.isPending && !selectedBranch) {
        return (
            <main className="flex h-screen min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background p-8">
                <Surface className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner size="sm" />
                    Loading branch details...
                </Surface>
            </main>
        );
    }

    if (isAwaitingBranchPassphrase) {
        return (
            <main className="flex h-screen min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background p-8">
                <Surface className="text-sm text-muted-foreground">
                    Waiting for SSH passphrase...
                </Surface>
            </main>
        );
    }

    if (!selectedBranch) {
        return (
            <main className="flex h-screen min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background p-8">
                <Surface className="rounded-md border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
                    This branch is no longer available.
                </Surface>
            </main>
        );
    }

    const commitsError =
        commitsQuery.error && !isAwaitingCommitPassphrase
            ? getErrorMessage(commitsQuery.error)
            : undefined;

    return (
        <main className="branch-page-main">
            <div className="branch-page-content">
                <div className="branch-page-header-shell">
                    <div className="branch-page-tabs" role="tablist">
                        <button
                            aria-selected={activeTab === "general"}
                            className={[
                                "branch-page-tab",
                                activeTab === "general"
                                    ? "branch-page-tab-active"
                                    : "",
                            ].join(" ")}
                            role="tab"
                            type="button"
                            onClick={() => setActiveTab("general")}
                        >
                            General
                        </button>
                        <button
                            aria-selected={activeTab === "run"}
                            className={[
                                "branch-page-tab",
                                activeTab === "run"
                                    ? "branch-page-tab-active"
                                    : "",
                            ].join(" ")}
                            role="tab"
                            type="button"
                            onClick={() => setActiveTab("run")}
                        >
                            Run
                        </button>
                        <button
                            aria-selected={activeTab === "diff"}
                            className={[
                                "branch-page-tab",
                                activeTab === "diff"
                                    ? "branch-page-tab-active"
                                    : "",
                            ].join(" ")}
                            role="tab"
                            type="button"
                            onClick={() => setActiveTab("diff")}
                        >
                            Diff
                        </button>
                    </div>
                    <Card className="rounded-lg border border-border bg-surface">
                        <Card.Content className="p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                    <Card.Description>
                                        {project.name}
                                    </Card.Description>
                                    <Card.Title className="mt-1 break-words text-2xl">
                                        {selectedBranch.name}
                                    </Card.Title>
                                </div>

                                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                    {selectedBranch.hasWorktree ? (
                                        <Surface className="flex h-9 items-center rounded-md border border-success/25 bg-success/10 px-3 text-xs text-success">
                                            Worktree ready
                                        </Surface>
                                    ) : (
                                        <Button
                                            isDisabled={isCheckingOutWorktree}
                                            tone="primary"
                                            type="button"
                                            onPress={() =>
                                                void onCheckoutBranch(
                                                    project.id,
                                                    selectedBranch.name,
                                                )
                                            }
                                        >
                                            {isCheckingOutWorktree ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <FolderPlus className="h-4 w-4" />
                                            )}
                                            Create worktree
                                        </Button>
                                    )}
                                    <Button
                                        aria-label="Reload commits"
                                        className="h-9 w-9 min-w-9 px-0"
                                        isDisabled={commitsQuery.isFetching}
                                        isIconOnly
                                        type="button"
                                        onPress={() =>
                                            void commitsQuery.refetch()
                                        }
                                    >
                                        <RefreshCw
                                            className={[
                                                "h-4 w-4",
                                                commitsQuery.isFetching
                                                    ? "animate-spin"
                                                    : "",
                                            ].join(" ")}
                                        />
                                    </Button>
                                </div>
                            </div>

                            {actionError ? (
                                <Surface className="mt-4 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
                                    {actionError}
                                </Surface>
                            ) : null}
                        </Card.Content>
                    </Card>
                </div>

                <div className="branch-page-body">
                    {activeTab === "general" ? (
                        <div className="branch-general-page">
                            <section className="branch-commits-section">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-base font-semibold">
                                        Last commits
                                    </h2>
                                    <span className="text-xs text-muted-foreground">
                                        {(commitsQuery.data ?? []).length} shown
                                    </span>
                                </div>
                                <div className="branch-commits-scroll">
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
                        </div>
                    ) : activeTab === "run" ? (
                        selectedBranch.hasWorktree ? (
                            <div className="branch-run-page">
                                <Suspense
                                    fallback={
                                        <Surface className="branch-scripts-state">
                                            <Spinner size="sm" /> Loading
                                            scripts...
                                        </Surface>
                                    }
                                >
                                    <BranchScriptsSection
                                        branchName={selectedBranch.name}
                                        projectId={project.id}
                                        onCreateScript={onCreateScript}
                                        onRunCommand={runTerminalCommand}
                                    />
                                </Suspense>

                                <section className="worktree-terminal-section">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h2 className="text-base font-semibold">
                                            Terminal
                                        </h2>
                                        <span className="truncate pl-4 text-xs text-muted-foreground">
                                            {selectedBranch.worktreePath}
                                        </span>
                                    </div>
                                    <Suspense
                                        fallback={
                                            <div className="worktree-terminal-viewport worktree-terminal-loading">
                                                Loading terminal...
                                            </div>
                                        }
                                    >
                                        <WorktreeTerminal
                                            ref={setTerminalHandle}
                                            worktreePath={
                                                selectedBranch.worktreePath
                                            }
                                        />
                                    </Suspense>
                                </section>
                            </div>
                        ) : (
                            <Surface className="branch-scripts-state">
                                Create the worktree to run scripts.
                            </Surface>
                        )
                    ) : (
                        <Suspense
                            fallback={
                                <Surface className="rounded-md text-sm text-muted-foreground">
                                    Loading diff...
                                </Surface>
                            }
                        >
                            <BranchDiffPanel
                                branchName={selectedBranch.name}
                                projectId={project.id}
                            />
                        </Suspense>
                    )}
                </div>
            </div>
        </main>
    );
}
