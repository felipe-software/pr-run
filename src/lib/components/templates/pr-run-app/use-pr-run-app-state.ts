import { useMemo } from "react";

import { useConfigQuery } from "@/lib/hooks/query/use-config-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import { assignProjectAvatars } from "@/lib/project-avatar";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { BranchInfo, ProjectConfig, ProjectGroup } from "@/types/pr-run";

import { useAppStatusSummary } from "@/lib/components/templates/pr-run-app/use-app-status-summary";
import { useAppTheme } from "@/lib/components/templates/pr-run-app/use-app-theme";
import { useProjectActions } from "@/lib/components/templates/pr-run-app/use-project-actions";
import { useSidebarLayout } from "@/lib/components/templates/pr-run-app/use-sidebar-layout";
import { useWorkspaceState } from "@/lib/components/templates/pr-run-app/workspace-state";

const EMPTY_PROJECT_GROUPS: ProjectGroup[] = [];

export function usePrRunAppState() {
    const configQuery = useConfigQuery();
    const groups = configQuery.data?.groups ?? EMPTY_PROJECT_GROUPS;
    const projects = useMemo(
        () => groups.flatMap((group) => group.projects),
        [groups],
    );
    const projectAvatarUris = useMemo(
        () => assignProjectAvatars(projects),
        [projects],
    );
    const workspaceState = useWorkspaceState({
        isProjectListReady: !configQuery.isPending,
        projects,
    });
    const actions = useProjectActions({
        closeWorktreeTab: workspaceState.closeWorktreeTab,
        openCreatedWorktree: workspaceState.openCreatedWorktree,
    });
    const sidebar = useSidebarLayout();
    const theme = useAppTheme();
    const { selectedBranchView, workspaceView } = workspaceState;
    const statusSummary = useAppStatusSummary(projects);
    const selectedBranchKey =
        workspaceView.type === "branch"
            ? `${workspaceView.projectId}:${workspaceView.branchName}`
            : null;

    return {
        ...actions,
        ...sidebar,
        ...theme,
        closeSettings: workspaceState.closeSettings,
        closeWorktreeTab: workspaceState.closeWorktreeTab,
        configError:
            configQuery.error && !configQuery.data
                ? getErrorMessage(configQuery.error)
                : undefined,
        groups,
        isCheckingOutWorktree:
            actions.isCheckingOutWorktree &&
            actions.pendingWorktreeCheckoutKey === selectedBranchKey,
        isLoadingConfig: configQuery.isPending,
        openOverview: () => {
            actions.clearActionError();
            workspaceState.openOverview();
        },
        openProjectOverview: (projectId: string) => {
            actions.clearActionError();
            workspaceState.openOverview(projectId);
        },
        openSettings: workspaceState.openSettings,
        openSshPassphrase: () => useSshPassphraseStore.getState().open(null),
        projectAvatarUris,
        selectBranch: (project: ProjectConfig, branch: BranchInfo) => {
            actions.clearActionError();
            workspaceState.selectBranch(project, branch);
        },
        selectedBranchView,
        selectWorktreeTab: workspaceState.selectWorktreeTab,
        setSettingsSection: workspaceState.setSettingsSection,
        statusSummary,
        workspaceView,
    };
}
