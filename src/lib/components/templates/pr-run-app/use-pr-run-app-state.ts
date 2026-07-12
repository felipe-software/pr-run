import { useEffect, useMemo, useState } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { toast } from "@/lib/components/ui/toast";
import { useAddProjectMutation } from "@/lib/hooks/query/use-add-project-mutation";
import { useCheckoutBranchMutation } from "@/lib/hooks/query/use-checkout-branch-mutation";
import { useConfigQuery } from "@/lib/hooks/query/use-config-query";
import { useCreateScriptMutation } from "@/lib/hooks/query/use-create-script-mutation";
import { useRemoveWorktreeMutation } from "@/lib/hooks/query/use-remove-worktree-mutation";
import { useUpdateProjectWorktreesMutation } from "@/lib/hooks/query/use-update-project-worktrees-mutation";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import { useUiPreferencesStore } from "@/lib/hooks/store/use-ui-preferences-store";
import {
    getWorktreeOwnerKey,
    useWorktreeTerminalStore,
} from "@/lib/hooks/store/use-worktree-terminal-store";
import { tryPromise } from "@/lib/error";
import { assignProjectAvatars } from "@/lib/project-avatar";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

import { useAppStatusSummary } from "@/lib/components/templates/pr-run-app/use-app-status-summary";
import { useSettingsState } from "@/lib/components/templates/pr-run-app/settings-state";
import { useWorkspaceState } from "@/lib/components/templates/pr-run-app/workspace-state";
import { sidebarResize } from "@/lib/components/templates/sidebar/sidebar-resize";
import { navigateToAppRoute } from "@/lib/navigation";

export function usePrRunAppState() {
    const settingsState = useSettingsState();
    const [actionError, setActionError] = useState<string>();
    const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(
        () => new Set(),
    );
    const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
    const [isCreateScriptOpen, setIsCreateScriptOpen] = useState(false);
    const storedSidebarWidth = useUiPreferencesStore(
        (store) => store.sidebarWidth,
    );
    const setStoredSidebarWidth = useUiPreferencesStore(
        (store) => store.setSidebarWidth,
    );
    const theme = useUiPreferencesStore((store) => store.theme);
    const setTheme = useUiPreferencesStore((store) => store.setTheme);
    const [sidebarWidth, setSidebarWidth] = useState(() =>
        sidebarResize.clamp(storedSidebarWidth ?? sidebarResize.defaultWidth),
    );
    const configQuery = useConfigQuery();
    const addProjectMutation = useAddProjectMutation();
    const checkoutBranchMutation = useCheckoutBranchMutation();
    const createScriptMutation = useCreateScriptMutation();
    const removeWorktreeMutation = useRemoveWorktreeMutation();
    const updateProjectWorktreesMutation = useUpdateProjectWorktreesMutation();
    const groups = configQuery.data?.groups ?? [];
    const projects = useMemo(
        () => groups.flatMap((group) => group.projects),
        [groups],
    );
    const projectAvatarUris = useMemo(
        () => assignProjectAvatars(projects),
        [projects],
    );
    const workspaceState = useWorkspaceState({
        onLeaveSettings: settingsState.closeSettings,
        projects,
    });
    const { selectedBranch, selectedBranchView } = workspaceState;
    const statusSummary = useAppStatusSummary(projects);
    const configError =
        configQuery.error && !configQuery.data
            ? getErrorMessage(configQuery.error)
            : undefined;

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const applyTheme = () => {
            const resolved =
                theme === "system" ? (media.matches ? "dark" : "light") : theme;
            document.documentElement.classList.add("no-transitions");
            document.documentElement.dataset.theme = resolved;
            document.documentElement.classList.toggle(
                "dark",
                resolved === "dark",
            );
            document.documentElement.style.colorScheme = resolved;
            syncTitleBarTheme(resolved);
            window.setTimeout(
                () =>
                    document.documentElement.classList.remove("no-transitions"),
                0,
            );
        };

        applyTheme();
        media.addEventListener("change", applyTheme);
        return () => media.removeEventListener("change", applyTheme);
    }, [theme]);

    function resizeSidebar(width: number) {
        const nextWidth = sidebarResize.clamp(width);

        setSidebarWidth(nextWidth);
        setStoredSidebarWidth(nextWidth);
    }

    function toggleProject(projectId: string) {
        setCollapsedProjects((current) => {
            const next = new Set(current);

            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }

            return next;
        });
    }

    function closeSettings() {
        settingsState.closeSettings();

        if (selectedBranch) {
            navigateToAppRoute({ ...selectedBranch, type: "branch" });
            return;
        }

        navigateToAppRoute({ type: "overview" });
    }

    async function submitAddProject(projectPath: string) {
        const [error] = await tryPromise(
            addProjectMutation.mutateAsync(projectPath),
        );

        if (error) {
            return;
        }

        setIsAddProjectOpen(false);
    }

    async function checkoutBranch(projectId: string, branchName: string) {
        setActionError(undefined);
        const [error, result] = await tryPromise(
            checkoutBranchMutation.mutateAsync({ branchName, projectId }),
        );

        if (error) {
            if (isHandledSshPromptError(error)) {
                useSshPassphraseStore
                    .getState()
                    .setRetryAction(`checkout:${projectId}:${branchName}`, () =>
                        checkoutBranch(projectId, branchName).then(
                            () => undefined,
                        ),
                    );
                return;
            }

            setActionError(getErrorMessage(error));
            return;
        }

        showSuccessToast(
            result.status === "ready" ? "Worktree ready" : result.message,
        );
        workspaceState.openCreatedWorktree(projectId, branchName);
    }

    async function createScript(title: string) {
        setActionError(undefined);
        const [error, script] = await tryPromise(
            createScriptMutation.mutateAsync(title),
        );

        if (error) {
            setActionError(getErrorMessage(error));
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        showSuccessToast(`${script.title} created.`);
        setIsCreateScriptOpen(false);
    }

    async function removeWorktree(projectId: string, branchName: string) {
        setActionError(undefined);
        const [error, result] = await tryPromise(
            removeWorktreeMutation.mutateAsync({ branchName, projectId }),
        );

        if (error) {
            if (isHandledSshPromptError(error)) {
                useSshPassphraseStore
                    .getState()
                    .setRetryAction(`remove:${projectId}:${branchName}`, () =>
                        removeWorktree(projectId, branchName).then(
                            () => undefined,
                        ),
                    );
                return;
            }

            setActionError(getErrorMessage(error));
            return;
        }

        showSuccessToast(result.message);
        workspaceState.closeWorktreeTab(`${projectId}:${branchName}`);
        await useWorktreeTerminalStore
            .getState()
            .disposeOwner(getWorktreeOwnerKey(projectId, branchName));
    }

    async function updateProject(project: ProjectConfig) {
        setActionError(undefined);
        const [error, result] = await tryPromise(
            updateProjectWorktreesMutation.mutateAsync(project.id),
        );

        if (error) {
            if (isHandledSshPromptError(error)) {
                useSshPassphraseStore
                    .getState()
                    .setRetryAction(`refresh:${project.id}`, () =>
                        updateProject(project).then(() => undefined),
                    );
                return false;
            }

            setActionError(getErrorMessage(error));
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return false;
        }

        showSuccessToast(result.message);
        return true;
    }

    return {
        actionError,
        addProjectError: addProjectMutation.error
            ? getErrorMessage(addProjectMutation.error)
            : undefined,
        createScriptError: createScriptMutation.error
            ? getErrorMessage(createScriptMutation.error)
            : undefined,
        configError,
        collapsedProjects,
        groups,
        isAddProjectOpen,
        isAddingProject: addProjectMutation.isPending,
        isCheckingOutWorktree:
            checkoutBranchMutation.isPending &&
            checkoutBranchMutation.variables?.projectId ===
                selectedBranch?.projectId &&
            checkoutBranchMutation.variables?.branchName ===
                selectedBranch?.branchName,
        isCreatingScript: createScriptMutation.isPending,
        isCreateScriptOpen,
        isLoadingConfig: configQuery.isPending,
        pendingProjectUpdateId: updateProjectWorktreesMutation.isPending
            ? updateProjectWorktreesMutation.variables
            : undefined,
        projectAvatarUris,
        pendingWorktreeCheckoutKey: checkoutBranchMutation.isPending
            ? `${checkoutBranchMutation.variables?.projectId}:${checkoutBranchMutation.variables?.branchName}`
            : undefined,
        pendingWorktreeRemovalKey: removeWorktreeMutation.isPending
            ? `${removeWorktreeMutation.variables?.projectId}:${removeWorktreeMutation.variables?.branchName}`
            : undefined,
        selectedBranchView,
        sidebarWidth,
        statusSummary,
        theme,
        closeAddProject: () => setIsAddProjectOpen(false),
        closeCreateScript: () => setIsCreateScriptOpen(false),
        createScript,
        openAddProject: () => {
            addProjectMutation.reset();
            setIsAddProjectOpen(true);
        },
        openCreateScript: () => {
            createScriptMutation.reset();
            setIsCreateScriptOpen(true);
        },
        openSshPassphrase: () => useSshPassphraseStore.getState().open(null),
        ...settingsState,
        closeSettings,
        removeWorktree,
        resizeSidebar,
        setTheme,
        submitAddProject,
        toggleProject,
        updateProject,
        checkoutBranch,
        closeWorktreeTab: workspaceState.closeWorktreeTab,
        isOverviewOpen: workspaceState.isOverviewOpen,
        openOverview: () => {
            setActionError(undefined);
            workspaceState.openOverview();
        },
        openProjectOverview: (projectId: string) => {
            setActionError(undefined);
            workspaceState.openOverview(projectId);
        },
        overviewProjectId: workspaceState.overviewProjectId,
        selectBranch: (project: ProjectConfig, branch: BranchInfo) => {
            setActionError(undefined);
            workspaceState.selectBranch(project, branch);
        },
        selectWorktreeTab: workspaceState.selectWorktreeTab,
    };
}

async function syncTitleBarTheme(theme: "dark" | "light") {
    if (!window.prRun) {
        return;
    }

    const [error] = await tryPromise(window.prRun.setTitleBarTheme(theme));

    if (error) {
        console.error("Failed to update the title bar theme.", error);
    }
}

function showSuccessToast(message: string) {
    toast.success(message, {
        timeout: 2400,
    });
}
