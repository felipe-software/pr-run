import { Box, ChevronRight, Package, Play, Trash2 } from "lucide-react";
import { useState } from "react";

import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { CustomActions } from "@/lib/components/templates/main-panel/run/custom-actions";
import { PackageScriptPicker } from "@/lib/components/templates/main-panel/run/package-script-picker";
import { Button } from "@/lib/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPopup,
    DialogTitle,
} from "@/lib/components/ui/dialog";
import { toast } from "@/lib/components/ui/toast";
import { tryPromise } from "@/lib/error";
import { useDeleteScriptMutation } from "@/lib/hooks/query/use-delete-script-mutation";
import { useOpenScriptMutation } from "@/lib/hooks/query/use-open-script-mutation";
import { usePackageScriptsQuery } from "@/lib/hooks/query/use-package-scripts-query";
import { usePreparePackageScriptCommandMutation } from "@/lib/hooks/query/use-prepare-package-script-command-mutation";
import { useRunScriptMutation } from "@/lib/hooks/query/use-run-script-mutation";
import { useScriptsQuery } from "@/lib/hooks/query/use-scripts-query";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { PackageScriptInfo, ScriptInfo } from "@/types/pr-run";

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
    const packageScriptsQuery = usePackageScriptsQuery(projectId, branchName);
    const scriptsQuery = useScriptsQuery();
    const preparePackageMutation = usePreparePackageScriptCommandMutation();
    const runScriptMutation = useRunScriptMutation();
    const deleteScriptMutation = useDeleteScriptMutation();
    const openScriptMutation = useOpenScriptMutation();
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<ScriptInfo | null>(null);
    const customActions = (scriptsQuery.data ?? []).filter(
        (script) => script.button,
    );

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

    async function sendCommand(command: string, title: string) {
        const [error] = await tryPromise(
            onRunScriptCommand({ command, scriptTitle: title }),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
        }
    }

    async function editScript(script: ScriptInfo) {
        const [error] = await tryPromise(
            openScriptMutation.mutateAsync(script.id),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
        }
    }

    async function deleteScript() {
        if (!pendingDelete) {
            return;
        }

        const [error] = await tryPromise(
            deleteScriptMutation.mutateAsync(pendingDelete.id),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        toast.success(`${pendingDelete.title} deleted.`, { timeout: 2200 });
        setPendingDelete(null);
    }

    const catalog = packageScriptsQuery.data;
    const scriptCount =
        catalog?.packages.reduce(
            (total, group) => total + group.scripts.length,
            0,
        ) ?? 0;

    return (
        <section className="min-w-0 shrink-0">
            <Surface className="overflow-hidden">
                <div
                    className="flex flex-wrap items-start justify-between gap-3
                        px-3 py-2.5"
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <Package className="text-muted-foreground size-4" />
                            <h2 className="text-sm font-semibold">
                                Package scripts
                            </h2>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                            {catalog
                                ? `${scriptCount} scripts · ${catalog.manager}`
                                : "Detecting scripts from this worktree…"}
                        </p>
                    </div>
                    {catalog && scriptCount > 0 ? (
                        <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setIsPickerOpen(true)}
                        >
                            All package scripts
                            <ChevronRight className="size-3.5" />
                        </Button>
                    ) : null}
                </div>

                {packageScriptsQuery.isPending ? (
                    <div
                        className="grid grid-cols-2 gap-1.5 px-2.5 pb-2.5
                            md:grid-cols-3"
                    >
                        {Array.from({ length: 6 }).map((_, index) => (
                            <Skeleton className="h-12" key={index} />
                        ))}
                    </div>
                ) : packageScriptsQuery.error ? (
                    <div className="text-danger px-3 pb-2.5 text-xs">
                        {getErrorMessage(packageScriptsQuery.error)} Custom
                        actions and the terminal are still available.
                    </div>
                ) : catalog?.quickScripts.length ? (
                    <div
                        className="grid
                            grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]
                            gap-1.5 px-2.5 pb-2.5"
                    >
                        {catalog.quickScripts.map((script) => {
                            const isPreparing =
                                preparePackageMutation.isPending &&
                                preparePackageMutation.variables
                                    ?.packagePath === script.packagePath &&
                                preparePackageMutation.variables?.scriptName ===
                                    script.name;

                            return (
                                <button
                                    className="border-border/70 bg-background
                                        hover:bg-muted/30
                                        focus-visible:ring-ring group flex
                                        min-w-0 items-center gap-2 rounded-md
                                        border px-2 py-1.5 text-left
                                        transition-colors outline-none
                                        focus-visible:ring-2
                                        disabled:opacity-60"
                                    disabled={isPreparing}
                                    key={`${script.packagePath}:${script.name}`}
                                    type="button"
                                    onClick={() => runPackageScript(script)}
                                >
                                    <span
                                        className="bg-primary/10 text-primary
                                            grid size-7 shrink-0
                                            place-items-center rounded-md"
                                    >
                                        {script.packagePath === "." ? (
                                            <Play className="size-3.5" />
                                        ) : (
                                            <Box className="size-3.5" />
                                        )}
                                    </span>
                                    <span className="min-w-0">
                                        <span
                                            className="block truncate text-xs
                                                font-semibold"
                                        >
                                            {isPreparing
                                                ? "Preparing…"
                                                : script.name}
                                        </span>
                                        <span
                                            className="text-muted-foreground
                                                block truncate font-mono
                                                text-[10px]"
                                        >
                                            {script.command}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-muted-foreground px-3 pb-2.5 text-xs">
                        No package scripts were found in this worktree.
                    </p>
                )}

                <CustomActions
                    deletingId={deleteScriptMutation.variables}
                    onCreate={onCreateScript}
                    onDelete={setPendingDelete}
                    onEdit={editScript}
                    onRun={runCustomScript}
                    preparingId={runScriptMutation.variables?.scriptId}
                    scripts={customActions}
                />
            </Surface>

            {catalog ? (
                <PackageScriptPicker
                    catalog={catalog}
                    onOpenChange={setIsPickerOpen}
                    onRun={runPackageScript}
                    open={isPickerOpen}
                />
            ) : null}

            <Dialog
                open={Boolean(pendingDelete)}
                onOpenChange={(open) => !open && setPendingDelete(null)}
            >
                <DialogPopup showCloseButton={!deleteScriptMutation.isPending}>
                    <DialogHeader>
                        <DialogTitle>Delete custom action</DialogTitle>
                        <DialogDescription>
                            Delete “{pendingDelete?.title ?? "this action"}”
                            from PR-run? This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            disabled={deleteScriptMutation.isPending}
                            variant="ghost"
                            onClick={() => setPendingDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={deleteScriptMutation.isPending}
                            variant="destructive"
                            onClick={deleteScript}
                        >
                            <Trash2 className="size-4" />
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogPopup>
            </Dialog>
        </section>
    );
}
