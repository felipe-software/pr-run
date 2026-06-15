import { toast } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { useAddProjectMutation } from "@/lib/hooks/query/use-add-project-mutation";
import { useCheckoutBranchMutation } from "@/lib/hooks/query/use-checkout-branch-mutation";
import { useConfigQuery } from "@/lib/hooks/query/use-config-query";
import { useCreateScriptMutation } from "@/lib/hooks/query/use-create-script-mutation";
import { useRemoveWorktreeMutation } from "@/lib/hooks/query/use-remove-worktree-mutation";
import { useUpdateProjectWorktreesMutation } from "@/lib/hooks/query/use-update-project-worktrees-mutation";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import {
    getWorktreeOwnerKey,
    useWorktreeTerminalStore,
} from "@/lib/hooks/store/use-worktree-terminal-store";
import { tryPromise } from "@/lib/error";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ProjectConfig } from "@/types/pr-run";

import type {
    SelectedBranchState,
    SelectedBranchView,
} from "@/lib/components/templates/pr-run-app/types";

const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 560;

export function usePrRunAppState() {
    const isElectronApiAvailable = typeof window.prRun !== "undefined";
    const [selectedBranch, setSelectedBranch] =
        useState<SelectedBranchState | null>(null);
    const [actionError, setActionError] = useState<string>();
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        () => new Set(["default"]),
    );
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
        () => new Set(),
    );
    const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
    const [isCreateScriptOpen, setIsCreateScriptOpen] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light">(() => {
        return localStorage.getItem("pr-run-theme") === "light"
            ? "light"
            : "dark";
    });
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const stored = Number(localStorage.getItem("pr-run-sidebar-width"));

        return Number.isFinite(stored)
            ? clamp(stored, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH)
            : 320;
    });
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const configQuery = useConfigQuery(isElectronApiAvailable);
    const addProjectMutation = useAddProjectMutation();
    const checkoutBranchMutation = useCheckoutBranchMutation();
    const createScriptMutation = useCreateScriptMutation();
    const removeWorktreeMutation = useRemoveWorktreeMutation();
    const updateProjectWorktreesMutation = useUpdateProjectWorktreesMutation();
    const groups = configQuery.data?.groups ?? [];
    const selectedProject = useMemo(
        () =>
            groups
                .flatMap((group) => group.projects)
                .find((project) => project.id === selectedBranch?.projectId) ??
            null,
        [groups, selectedBranch?.projectId],
    );
    const selectedBranchView: SelectedBranchView = {
        branchName: selectedBranch?.branchName ?? null,
        project: selectedProject,
    };
    const configError = !isElectronApiAvailable
        ? "Electron API is unavailable. Open this app through Electron."
        : configQuery.error
          ? getErrorMessage(configQuery.error)
          : undefined;

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.colorScheme = theme;
        localStorage.setItem("pr-run-theme", theme);
    }, [theme]);

    useEffect(() => {
        if (!isResizingSidebar) {
            return;
        }

        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;

        function handleMouseMove(event: MouseEvent) {
            setSidebarWidth(
                clamp(event.clientX, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH),
            );
        }

        function handleMouseUp() {
            setIsResizingSidebar(false);
        }

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizingSidebar]);

    useEffect(() => {
        localStorage.setItem("pr-run-sidebar-width", String(sidebarWidth));
    }, [sidebarWidth]);

    useEffect(() => {
        if (!selectedBranch || selectedProject) {
            return;
        }

        setSelectedBranch(null);
    }, [selectedBranch, selectedProject]);

    function toggleGroup(groupId: string) {
        setExpandedGroups((current) => {
            const next = new Set(current);

            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }

            return next;
        });
    }

    function toggleProject(projectId: string) {
        setExpandedProjects((current) => {
            const next = new Set(current);

            if (next.has(projectId)) {
                next.delete(projectId);
            } else {
                next.add(projectId);
            }

            return next;
        });
    }

    function selectBranch(projectId: string, branchName: string) {
        setActionError(undefined);
        setSelectedBranch({ branchName, projectId });
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
                    .setRetryAction(() =>
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
    }

    async function createScript(title: string) {
        setActionError(undefined);
        const [error, script] = await tryPromise(
            createScriptMutation.mutateAsync(title),
        );

        if (error) {
            setActionError(getErrorMessage(error));
            toast.danger(getErrorMessage(error), { timeout: 3200 });
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
                    .setRetryAction(() =>
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
                    .setRetryAction(() =>
                        updateProject(project).then(() => undefined),
                    );
                return;
            }

            setActionError(getErrorMessage(error));
            return;
        }

        showSuccessToast(result.message);
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
        expandedGroups,
        expandedProjects,
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
        pendingWorktreeRemovalKey: removeWorktreeMutation.isPending
            ? `${removeWorktreeMutation.variables?.projectId}:${removeWorktreeMutation.variables?.branchName}`
            : undefined,
        selectedBranchView,
        sidebarWidth,
        theme,
        beginResize: () => setIsResizingSidebar(true),
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
        removeWorktree,
        selectBranch,
        setTheme,
        submitAddProject,
        toggleGroup,
        toggleProject,
        updateProject,
        checkoutBranch,
    };
}

function showSuccessToast(message: string) {
    toast.success(message, {
        timeout: 2400,
    });
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
