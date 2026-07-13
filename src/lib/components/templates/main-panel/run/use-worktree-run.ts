import { useMemo } from "react";

import { toast } from "@/lib/components/ui/toast";
import { deriveRunScriptLists } from "@/lib/components/templates/main-panel/run/run-script-derivations";
import { tryPromise } from "@/lib/error";
import { useDeleteScriptMutation } from "@/lib/hooks/query/use-delete-script-mutation";
import { useOpenScriptMutation } from "@/lib/hooks/query/use-open-script-mutation";
import { usePackageScriptsQuery } from "@/lib/hooks/query/use-package-scripts-query";
import { usePreparePackageScriptCommandMutation } from "@/lib/hooks/query/use-prepare-package-script-command-mutation";
import { useRunScriptMutation } from "@/lib/hooks/query/use-run-script-mutation";
import { useScriptsQuery } from "@/lib/hooks/query/use-scripts-query";
import {
    getProjectFavoriteKeys,
    usePackageScriptFavoritesStore,
} from "@/lib/hooks/store/use-package-script-favorites-store";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { PackageScriptInfo, ScriptInfo } from "@/types/pr-run";

type UseWorktreeRunParams = {
    branchName: string;
    onRunScriptCommand: (payload: {
        command: string;
        scriptTitle: string;
    }) => Promise<void>;
    projectId: string;
};

export function useWorktreeRun({
    branchName,
    onRunScriptCommand,
    projectId,
}: UseWorktreeRunParams) {
    const packageScriptsQuery = usePackageScriptsQuery(projectId, branchName);
    const scriptsQuery = useScriptsQuery();
    const preparePackageMutation = usePreparePackageScriptCommandMutation();
    const runScriptMutation = useRunScriptMutation();
    const deleteScriptMutation = useDeleteScriptMutation();
    const openScriptMutation = useOpenScriptMutation();
    const favoriteKeys = usePackageScriptFavoritesStore((store) =>
        getProjectFavoriteKeys(store.favoriteKeysByProject, projectId),
    );
    const toggleFavoriteInStore = usePackageScriptFavoritesStore(
        (store) => store.toggleFavorite,
    );
    const catalog = packageScriptsQuery.data;
    const lists = useMemo(
        () =>
            deriveRunScriptLists(
                catalog,
                scriptsQuery.data ?? [],
                favoriteKeys,
            ),
        [catalog, favoriteKeys, scriptsQuery.data],
    );

    async function sendCommand(command: string, title: string) {
        const [error] = await tryPromise(
            onRunScriptCommand({ command, scriptTitle: title }),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
        }
    }

    async function runPackageScript(script: PackageScriptInfo) {
        const [prepareError, prepared] = await tryPromise(
            preparePackageMutation.mutateAsync({
                branchName,
                packagePath: script.packagePath,
                projectId,
                scriptName: script.name,
            }),
        );

        if (prepareError) {
            toast.error(getErrorMessage(prepareError), { timeout: 3200 });
            return;
        }

        await sendCommand(prepared.command, prepared.title);
    }

    async function runCustomScript(script: ScriptInfo) {
        const [prepareError, prepared] = await tryPromise(
            runScriptMutation.mutateAsync({
                branchName,
                projectId,
                scriptId: script.id,
            }),
        );

        if (prepareError) {
            toast.error(getErrorMessage(prepareError), { timeout: 3200 });
            return;
        }

        await sendCommand(prepared.command, script.title);
    }

    async function editScript(script: ScriptInfo) {
        const [error] = await tryPromise(
            openScriptMutation.mutateAsync(script.id),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
        }
    }

    async function deleteScript(script: ScriptInfo) {
        const [error] = await tryPromise(
            deleteScriptMutation.mutateAsync(script.id),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return false;
        }

        toast.success(`${script.title} deleted.`, { timeout: 2200 });
        return true;
    }

    function isPreparingPackageScript(script: PackageScriptInfo) {
        return (
            preparePackageMutation.isPending &&
            preparePackageMutation.variables?.packagePath ===
                script.packagePath &&
            preparePackageMutation.variables?.scriptName === script.name
        );
    }

    return {
        ...lists,
        catalog,
        deleteScript,
        deletingScriptId: deleteScriptMutation.variables,
        editScript,
        isDeletingScript: deleteScriptMutation.isPending,
        isPackageScriptsLoading: packageScriptsQuery.isPending,
        isPreparingPackageScript,
        packageScriptsError: packageScriptsQuery.error,
        preparingCustomScriptId: runScriptMutation.variables?.scriptId,
        runCustomScript,
        runPackageScript,
        toggleFavorite: (script: PackageScriptInfo) =>
            toggleFavoriteInStore(projectId, script),
    };
}
