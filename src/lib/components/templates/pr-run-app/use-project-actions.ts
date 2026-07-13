import { useState } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { toast } from "@/lib/components/ui/toast";
import { useAddProjectMutation } from "@/lib/hooks/query/use-add-project-mutation";
import { useCheckoutBranchMutation } from "@/lib/hooks/query/use-checkout-branch-mutation";
import { useCreateScriptMutation } from "@/lib/hooks/query/use-create-script-mutation";
import { useRemoveWorktreeMutation } from "@/lib/hooks/query/use-remove-worktree-mutation";
import { useUpdateProjectWorktreesMutation } from "@/lib/hooks/query/use-update-project-worktrees-mutation";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import { getWorktreeOwnerKey } from "@/lib/hooks/store/use-worktree-terminal-store";
import { useWorktreeTerminalActions } from "@/lib/hooks/use-worktree-terminal-actions";
import { tryPromise } from "@/lib/error";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ProjectConfig } from "@/types/pr-run";

type ProjectActionOptions = {
    closeWorktreeTab(key: string): void;
    openCreatedWorktree(projectId: string, branchName: string): void;
};

export function useProjectActions(options: ProjectActionOptions) {
    const { disposeOwner } = useWorktreeTerminalActions();
    const [actionError, setActionError] = useState<string>();
    const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
    const [isCreateScriptOpen, setIsCreateScriptOpen] = useState(false);
    const addProjectMutation = useAddProjectMutation();
    const checkoutBranchMutation = useCheckoutBranchMutation();
    const createScriptMutation = useCreateScriptMutation();
    const removeWorktreeMutation = useRemoveWorktreeMutation();
    const updateProjectWorktreesMutation = useUpdateProjectWorktreesMutation();

    async function submitAddProject(projectPath: string) {
        const [error] = await tryPromise(
            addProjectMutation.mutateAsync(projectPath),
        );
        if (!error) {
            setIsAddProjectOpen(false);
        }
    }

    async function checkoutBranch(projectId: string, branchName: string) {
        setActionError(undefined);
        const [error, result] = await tryPromise(
            checkoutBranchMutation.mutateAsync({ branchName, projectId }),
        );

        if (error) {
            handleSshRetryOrError(
                error,
                `checkout:${projectId}:${branchName}`,
                () => checkoutBranch(projectId, branchName),
            );
            return;
        }

        showSuccessToast(
            result.status === "ready" ? "Worktree ready" : result.message,
        );
        options.openCreatedWorktree(projectId, branchName);
    }

    async function createScript(title: string) {
        setActionError(undefined);
        const [error, script] = await tryPromise(
            createScriptMutation.mutateAsync(title),
        );

        if (error) {
            const message = getErrorMessage(error);
            setActionError(message);
            toast.error(message, { timeout: 3200 });
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
            handleSshRetryOrError(
                error,
                `remove:${projectId}:${branchName}`,
                () => removeWorktree(projectId, branchName),
            );
            return;
        }

        showSuccessToast(result.message);
        options.closeWorktreeTab(`${projectId}:${branchName}`);
        await disposeOwner(getWorktreeOwnerKey(projectId, branchName));
    }

    async function updateProject(project: ProjectConfig) {
        setActionError(undefined);
        const [error, result] = await tryPromise(
            updateProjectWorktreesMutation.mutateAsync(project.id),
        );

        if (error) {
            if (isHandledSshPromptError(error)) {
                setSshRetry(`refresh:${project.id}`, () =>
                    updateProject(project),
                );
                return false;
            }

            const message = getErrorMessage(error);
            setActionError(message);
            toast.error(message, { timeout: 3200 });
            return false;
        }

        showSuccessToast(result.message);
        return true;
    }

    function handleSshRetryOrError(
        error: unknown,
        key: string,
        retry: () => Promise<unknown>,
    ) {
        if (isHandledSshPromptError(error)) {
            setSshRetry(key, retry);
            return;
        }
        setActionError(getErrorMessage(error));
    }

    return {
        actionError,
        addProjectError: mutationError(addProjectMutation.error),
        checkoutBranch,
        clearActionError: () => setActionError(undefined),
        closeAddProject: () => setIsAddProjectOpen(false),
        closeCreateScript: () => setIsCreateScriptOpen(false),
        createScript,
        createScriptError: mutationError(createScriptMutation.error),
        isAddProjectOpen,
        isAddingProject: addProjectMutation.isPending,
        isCheckingOutWorktree: checkoutBranchMutation.isPending,
        isCreateScriptOpen,
        isCreatingScript: createScriptMutation.isPending,
        openAddProject: () => {
            addProjectMutation.reset();
            setIsAddProjectOpen(true);
        },
        openCreateScript: () => {
            createScriptMutation.reset();
            setIsCreateScriptOpen(true);
        },
        pendingProjectUpdateId: updateProjectWorktreesMutation.isPending
            ? updateProjectWorktreesMutation.variables
            : undefined,
        pendingWorktreeCheckoutKey: checkoutBranchMutation.isPending
            ? mutationKey(checkoutBranchMutation.variables)
            : undefined,
        pendingWorktreeRemovalKey: removeWorktreeMutation.isPending
            ? mutationKey(removeWorktreeMutation.variables)
            : undefined,
        removeWorktree,
        submitAddProject,
        updateProject,
    };
}

function setSshRetry(key: string, retry: () => Promise<unknown>) {
    useSshPassphraseStore
        .getState()
        .setRetryAction(key, () => retry().then(() => undefined));
}

function mutationError(error: Error | null) {
    return error ? getErrorMessage(error) : undefined;
}

function mutationKey(variables?: { branchName: string; projectId: string }) {
    return variables
        ? `${variables.projectId}:${variables.branchName}`
        : undefined;
}

function showSuccessToast(message: string) {
    toast.success(message, { timeout: 2400 });
}
