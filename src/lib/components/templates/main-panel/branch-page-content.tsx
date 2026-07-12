import { lazy, Suspense } from "react";

import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { WorktreeActivity } from "@/lib/components/templates/main-panel/activity";
import type { BranchPageTab } from "@/lib/components/templates/pr-run-app/types";
import type {
    BranchInfo,
    ProjectConfig,
    WorktreeActivityResult,
} from "@/types/pr-run";

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

type BranchPageContentProps = {
    activeTab: BranchPageTab;
    activity?: WorktreeActivityResult;
    activityError?: string;
    branch: BranchInfo;
    isActivityLoading: boolean;
    isAwaitingActivityPassphrase: boolean;
    isReviewComposerOpen: boolean;
    project: ProjectConfig;
    onCloseReview: () => void;
    onCreateScript: () => void;
    onRunTerminalCommand: (input: {
        command: string;
        scriptTitle: string;
    }) => Promise<void>;
};

function LoadingSurface({ height = "h-20" }: { height?: string }) {
    return (
        <Surface className="flex flex-col gap-2 px-3 py-3" variant="muted">
            <Skeleton className="h-4 w-32" />
            <Skeleton className={`${height} w-full`} />
        </Surface>
    );
}

function NoWorktreeState({ description }: { description: string }) {
    return (
        <Surface className="min-h-48" variant="muted">
            <EmptyState
                description={description}
                title="No worktree available"
            />
        </Surface>
    );
}

export function BranchPageContent({
    activeTab,
    activity,
    activityError,
    branch,
    isActivityLoading,
    isAwaitingActivityPassphrase,
    isReviewComposerOpen,
    project,
    onCloseReview,
    onCreateScript,
    onRunTerminalCommand,
}: BranchPageContentProps) {
    if (activeTab === "activity") {
        return (
            <WorktreeActivity
                baseBranchName={branch.compareBranchName}
                branchName={branch.name}
                data={activity}
                error={
                    isAwaitingActivityPassphrase
                        ? "Waiting for SSH passphrase..."
                        : activityError
                }
                isLoading={isActivityLoading}
                isReviewComposerOpen={isReviewComposerOpen}
                projectId={project.id}
                pullRequestAuthorLogin={branch.pullRequest?.author?.login}
                pullRequestNumber={branch.pullRequest?.number}
                repositoryUrl={branch.repository?.url}
                onCloseReview={onCloseReview}
            />
        );
    }

    if (activeTab === "run") {
        if (!branch.hasWorktree) {
            return (
                <NoWorktreeState description="Create the worktree before running project scripts in a terminal." />
            );
        }

        return (
            <div className="flex min-h-0 flex-1 flex-col">
                <Suspense fallback={<LoadingSurface height="h-7" />}>
                    <WorktreeRun
                        branchName={branch.name}
                        projectId={project.id}
                        onCreateScript={onCreateScript}
                        onRunScriptCommand={onRunTerminalCommand}
                    />
                </Suspense>
            </div>
        );
    }

    if (activeTab === "changes") {
        return (
            <Suspense fallback={<LoadingSurface height="h-40" />}>
                <WorktreeChanges
                    activity={activity}
                    activityError={activityError}
                    baseBranchName={branch.compareBranchName}
                    branchName={branch.name}
                    projectId={project.id}
                    pullRequestNumber={branch.pullRequest?.number}
                />
            </Suspense>
        );
    }

    if (activeTab === "docker") {
        if (!branch.hasWorktree) {
            return (
                <NoWorktreeState description="Create the worktree before running Docker Compose commands for this branch." />
            );
        }

        return (
            <Suspense fallback={<LoadingSurface />}>
                <BranchDockerPanel
                    branchName={branch.name}
                    projectId={project.id}
                    onRunDockerCommand={onRunTerminalCommand}
                />
            </Suspense>
        );
    }

    if (!branch.hasWorktree) {
        return (
            <NoWorktreeState description="Create the worktree before reading env files for this branch." />
        );
    }

    return (
        <Suspense fallback={<LoadingSurface />}>
            <BranchEnvPanel branchName={branch.name} projectId={project.id} />
        </Suspense>
    );
}
