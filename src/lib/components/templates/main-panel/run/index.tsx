import { useState } from "react";

import { DeleteCustomActionDialog } from "@/lib/components/templates/main-panel/run/delete-custom-action-dialog";
import { FavoriteScriptsSection } from "@/lib/components/templates/main-panel/run/favorite-scripts-section";
import { PackageScriptPicker } from "@/lib/components/templates/main-panel/run/package-script-picker";
import { PackageScriptsSection } from "@/lib/components/templates/main-panel/run/package-scripts-section";
import { useWorktreeRun } from "@/lib/components/templates/main-panel/run/use-worktree-run";
import type { ScriptInfo } from "@/types/pr-run";

type WorktreeRunProps = {
    branchName: string;
    onCreateScript: () => void;
    onRunScriptCommand: (payload: {
        command: string;
        scriptTitle: string;
    }) => Promise<void>;
    projectId: string;
};

export function WorktreeRun({
    branchName,
    onCreateScript,
    onRunScriptCommand,
    projectId,
}: WorktreeRunProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<ScriptInfo | null>(null);
    const run = useWorktreeRun({ branchName, onRunScriptCommand, projectId });

    async function confirmDelete() {
        if (!pendingDelete) {
            return;
        }

        const didDelete = await run.deleteScript(pendingDelete);

        if (didDelete) {
            setPendingDelete(null);
        }
    }

    return (
        <section className="min-h-0 flex-1 overflow-y-auto pb-3">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-0.5">
                <FavoriteScriptsSection
                    catalog={run.catalog}
                    error={run.packageScriptsError}
                    favoriteScripts={run.favoriteScripts}
                    isLoading={run.isPackageScriptsLoading}
                    isPreparing={run.isPreparingPackageScript}
                    scriptCount={run.scriptCount}
                    onOpenPicker={() => setIsPickerOpen(true)}
                    onRun={run.runPackageScript}
                    onToggleFavorite={run.toggleFavorite}
                />
                <PackageScriptsSection
                    catalog={run.catalog}
                    customActions={run.customActions}
                    deletingScriptId={run.deletingScriptId}
                    isLoading={run.isPackageScriptsLoading}
                    isPreparingPackageScript={run.isPreparingPackageScript}
                    preparingCustomScriptId={run.preparingCustomScriptId}
                    scriptCount={run.scriptCount}
                    suggestedScripts={run.suggestedScripts}
                    onCreateScript={onCreateScript}
                    onDeleteScript={setPendingDelete}
                    onEditScript={run.editScript}
                    onOpenPicker={() => setIsPickerOpen(true)}
                    onRunCustomScript={run.runCustomScript}
                    onRunPackageScript={run.runPackageScript}
                    onToggleFavorite={run.toggleFavorite}
                />
            </div>

            {run.catalog ? (
                <PackageScriptPicker
                    catalog={run.catalog}
                    favoriteScriptKeys={run.favoriteScriptKeys}
                    open={isPickerOpen}
                    onOpenChange={setIsPickerOpen}
                    onRun={run.runPackageScript}
                    onToggleFavorite={run.toggleFavorite}
                />
            ) : null}

            <DeleteCustomActionDialog
                isDeleting={run.isDeletingScript}
                pendingDelete={pendingDelete}
                onCancel={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
            />
        </section>
    );
}
