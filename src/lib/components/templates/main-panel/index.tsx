import { BranchEmptyState } from "@/lib/components/templates/main-panel/branch-empty-state";
import { BranchPageContent } from "@/lib/components/templates/main-panel/branch-page-content";
import { BranchPageHeader } from "@/lib/components/templates/main-panel/branch-page-header";
import { BranchPageLayout } from "@/lib/components/templates/main-panel/branch-page-layout";
import { BranchPageTabs } from "@/lib/components/templates/main-panel/branch-page-tabs";
import {
    MainPanelLoadingState,
    MainPanelState,
} from "@/lib/components/templates/main-panel/main-panel-state";
import {
    useMainPanelState,
    type RunTerminalContext,
} from "@/lib/components/templates/main-panel/use-main-panel-state";
import { cn } from "@/lib/utils/cn";
import { getErrorMessage } from "@/lib/utils/get-error-message";
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

export function MainPanel(props: MainPanelProps) {
    if (!props.project || !props.branchName) {
        return <BranchEmptyState />;
    }

    const selectedKey = `${props.project.id}:${props.branchName}`;

    return (
        <SelectedBranchMainPanel
            key={selectedKey}
            {...props}
            branchName={props.branchName}
            project={props.project}
        />
    );
}

type SelectedBranchMainPanelProps = Omit<
    MainPanelProps,
    "branchName" | "project"
> & {
    branchName: string;
    project: ProjectConfig;
};

function SelectedBranchMainPanel({
    actionError,
    branchName,
    isRunTerminalDocked,
    isTerminalStateSyncPaused,
    isCheckingOutWorktree,
    project,
    onCheckoutBranch,
    onCreateScript,
    onRunTerminalContextChange,
}: SelectedBranchMainPanelProps) {
    const state = useMainPanelState({
        branchName,
        isTerminalStateSyncPaused,
        onRunTerminalContextChange,
        project,
    });

    if (state.isBranchesPending && !state.selectedBranch) {
        return (
            <MainPanelLoadingState>
                Loading branch details...
            </MainPanelLoadingState>
        );
    }

    if (state.isAwaitingBranchPassphrase) {
        return <MainPanelState>Waiting for SSH passphrase...</MainPanelState>;
    }

    if (!state.selectedBranch) {
        return (
            <MainPanelState tone="danger">
                This branch is no longer available.
            </MainPanelState>
        );
    }

    const selectedBranch = state.selectedBranch;
    const activityError =
        state.activityError &&
        !state.activity &&
        !state.isAwaitingActivityPassphrase
            ? getErrorMessage(state.activityError)
            : undefined;

    return (
        <main
            className={cn(
                `bg-background flex min-h-0 overflow-hidden px-3 py-3
                max-[900px]:px-2`,
                isRunTerminalDocked ? "shrink-0" : "h-full flex-1",
                state.activeTab !== "activity" && "max-[500px]:overflow-y-auto",
            )}
        >
            <BranchPageLayout
                contentVersion={state.activityContentVersion}
                isHeaderCompactable={
                    state.activeTab === "activity" ||
                    state.activeTab === "changes"
                }
                isReading={state.activeTab === "activity"}
                isReadingReady={!state.isActivityPending}
                renderHeader={(isCompact) => (
                    <BranchPageHeader
                        actionError={actionError}
                        branch={selectedBranch}
                        isCheckingOutWorktree={isCheckingOutWorktree}
                        isCompact={isCompact}
                        isRefreshing={state.isRefreshing}
                        project={project}
                        onCheckoutBranch={onCheckoutBranch}
                        onOpenReview={state.openReviewComposer}
                        onRefresh={state.refreshActiveTab}
                    />
                )}
                scrollKey={state.selectedKey}
                tabs={
                    <BranchPageTabs
                        activeTab={state.activeTab}
                        isRunTabBusy={state.isRunTabBusy}
                        onSelectTab={state.selectBranchPage}
                    />
                }
            >
                <BranchPageContent
                    activeTab={state.activeTab}
                    activity={state.activity}
                    activityError={activityError}
                    branch={selectedBranch}
                    isActivityLoading={state.isActivityPending}
                    isAwaitingActivityPassphrase={
                        state.isAwaitingActivityPassphrase
                    }
                    isReviewComposerOpen={state.isReviewComposerOpen}
                    project={project}
                    onCloseReview={state.closeReviewComposer}
                    onCreateScript={onCreateScript}
                    onRunTerminalCommand={state.runTerminalCommand}
                />
            </BranchPageLayout>
        </main>
    );
}

export type { RunTerminalContext };
