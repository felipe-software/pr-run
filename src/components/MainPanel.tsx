import { Card, Surface } from "@heroui/react";
import { Code2, FolderPlus, RefreshCw } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import type { BranchInfo, CommitInfo, ProjectConfig } from "@/types/pr-run";
import { AppButton } from "@/components/atoms/AppButton";
import { CommitHistory } from "@/components/CommitHistory";

const WorktreeTerminal = lazy(() =>
    import("./WorktreeTerminal").then((module) => ({
        default: module.WorktreeTerminal,
    })),
);

const BranchDiffPanel = lazy(() =>
    import("./BranchDiffPanel").then((module) => ({
        default: module.BranchDiffPanel,
    })),
);

type SelectedBranch = {
    project: ProjectConfig;
    branch: BranchInfo;
};

type MainPanelProps = {
    selected: SelectedBranch | null;
    actionError?: string;
    commits: CommitInfo[];
    commitsError?: string;
    isCheckingOutWorktree: boolean;
    isLoadingCommits: boolean;
    onCheckoutBranch: (
        project: ProjectConfig,
        branch: BranchInfo,
    ) => Promise<void>;
    onReloadCommits: () => Promise<void>;
};

type BranchPageTab = "general" | "diff";

export function MainPanel({
    selected,
    actionError,
    commits,
    commitsError,
    isCheckingOutWorktree,
    isLoadingCommits,
    onCheckoutBranch,
    onReloadCommits,
}: MainPanelProps) {
    const [activeTab, setActiveTab] = useState<BranchPageTab>("general");
    const selectedKey = selected
        ? `${selected.project.id}:${selected.branch.name}`
        : "";

    useEffect(() => {
        setActiveTab("general");
    }, [selectedKey]);

    if (!selected) {
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
                                        {selected.project.name}
                                    </Card.Description>
                                    <Card.Title className="mt-1 break-words text-2xl">
                                        {selected.branch.name}
                                    </Card.Title>
                                </div>

                                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                    {selected.branch.hasWorktree ? (
                                        <Surface className="flex h-9 items-center rounded-md border border-success/25 bg-success/10 px-3 text-xs text-success">
                                            Worktree ready
                                        </Surface>
                                    ) : (
                                        <AppButton
                                            isDisabled={isCheckingOutWorktree}
                                            tone="primary"
                                            type="button"
                                            onPress={() =>
                                                void onCheckoutBranch(
                                                    selected.project,
                                                    selected.branch,
                                                )
                                            }
                                        >
                                            {isCheckingOutWorktree ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <FolderPlus className="h-4 w-4" />
                                            )}
                                            Create worktree
                                        </AppButton>
                                    )}
                                    <AppButton
                                        aria-label="Reload commits"
                                        className="h-9 w-9 min-w-9 px-0"
                                        isDisabled={isLoadingCommits}
                                        isIconOnly
                                        type="button"
                                        onPress={() => void onReloadCommits()}
                                    >
                                        <RefreshCw
                                            className={[
                                                "h-4 w-4",
                                                isLoadingCommits
                                                    ? "animate-spin"
                                                    : "",
                                            ].join(" ")}
                                        />
                                    </AppButton>
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
                            {selected.branch.hasWorktree ? (
                                <section className="worktree-terminal-section">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h2 className="text-base font-semibold">
                                            Terminal
                                        </h2>
                                        <span className="truncate pl-4 text-xs text-muted-foreground">
                                            {selected.branch.worktreePath}
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
                                            worktreePath={
                                                selected.branch.worktreePath
                                            }
                                        />
                                    </Suspense>
                                </section>
                            ) : null}

                            <section className="branch-commits-section">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-base font-semibold">
                                        Last commits
                                    </h2>
                                    <span className="text-xs text-muted-foreground">
                                        {commits.length} shown
                                    </span>
                                </div>
                                <div className="branch-commits-scroll">
                                    <CommitHistory
                                        commits={commits}
                                        error={commitsError}
                                        isLoading={isLoadingCommits}
                                    />
                                </div>
                            </section>
                        </div>
                    ) : (
                        <Suspense
                            fallback={
                                <Surface className="rounded-md text-sm text-muted-foreground">
                                    Loading diff...
                                </Surface>
                            }
                        >
                            <BranchDiffPanel
                                branch={selected.branch}
                                project={selected.project}
                            />
                        </Suspense>
                    )}
                </div>
            </div>
        </main>
    );
}
