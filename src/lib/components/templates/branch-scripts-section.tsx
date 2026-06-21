import { toast } from "@heroui/react";
import { Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/lib/components/atoms/button";
import { Chip } from "@/lib/components/atoms/chip";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { tryPromise } from "@/lib/error";
import { useDeleteScriptMutation } from "@/lib/hooks/query/use-delete-script-mutation";
import { useOpenScriptMutation } from "@/lib/hooks/query/use-open-script-mutation";
import { useRunScriptMutation } from "@/lib/hooks/query/use-run-script-mutation";
import { useScriptsQuery } from "@/lib/hooks/query/use-scripts-query";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ScriptInfo } from "@/types/pr-run";

type BranchScriptsSectionProps = {
    branchName: string;
    projectId: string;
    onCreateScript: () => void;
    onRunScriptCommand: (payload: {
        command: string;
        scriptTitle: string;
    }) => Promise<void>;
};

export function BranchScriptsSection({
    branchName,
    projectId,
    onCreateScript,
    onRunScriptCommand,
}: BranchScriptsSectionProps) {
    const scriptsQuery = useScriptsQuery();
    const runScriptMutation = useRunScriptMutation();
    const deleteScriptMutation = useDeleteScriptMutation();
    const openScriptMutation = useOpenScriptMutation();
    const [scriptPendingDelete, setScriptPendingDelete] =
        useState<ScriptInfo | null>(null);

    async function editScript(script: ScriptInfo) {
        const [error] = await tryPromise(
            openScriptMutation.mutateAsync(script.id),
        );

        if (error) {
            toast.danger(getErrorMessage(error), { timeout: 3200 });
        }
    }

    async function runScript(script: ScriptInfo) {
        const [error, result] = await tryPromise(
            runScriptMutation.mutateAsync({
                branchName,
                projectId,
                scriptId: script.id,
            }),
        );

        if (error) {
            toast.danger(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        const [commandError] = await tryPromise(
            onRunScriptCommand({
                command: result.command,
                scriptTitle: script.title,
            }),
        );

        if (commandError) {
            toast.danger(getErrorMessage(commandError), { timeout: 3200 });
        }
    }

    async function deleteScript(script: ScriptInfo) {
        const [error] = await tryPromise(
            deleteScriptMutation.mutateAsync(script.id),
        );

        if (error) {
            toast.danger(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        toast.success(`${script.title} deleted.`, { timeout: 2400 });
        setScriptPendingDelete(null);
    }

    return (
        <section className="min-w-0 shrink-0">
            <Surface className="px-2 py-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">Scripts</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                            {(scriptsQuery.data ?? []).length} available
                        </span>
                        <Button
                            size="xs"
                            type="button"
                            variant="outline"
                            onPress={onCreateScript}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create script
                        </Button>
                    </div>
                </div>

                {scriptsQuery.isPending ? (
                    <div className="grid gap-1.5">
                        <Skeleton className="h-7 w-full" />
                        <Skeleton className="h-7 w-10/12" />
                    </div>
                ) : scriptsQuery.error ? (
                    <Surface className="px-3 py-2 text-sm" variant="danger">
                        {getErrorMessage(scriptsQuery.error)}
                    </Surface>
                ) : scriptsQuery.data?.length ? (
                    <div className="flex flex-wrap gap-2">
                        {scriptsQuery.data.map((script) => {
                            const isPreparing =
                                runScriptMutation.isPending &&
                                runScriptMutation.variables?.scriptId ===
                                    script.id;
                            const isDeleting =
                                deleteScriptMutation.isPending &&
                                deleteScriptMutation.variables === script.id;

                            return (
                                <div
                                    className="group relative self-start"
                                    key={script.id}
                                >
                                    <Chip
                                        as="button"
                                        className="hover:bg-muted/30
                                            disabled:text-muted-foreground h-8
                                            max-w-64 cursor-pointer
                                            justify-start gap-1.5 pr-[58px]
                                            text-left transition
                                            disabled:cursor-not-allowed
                                            disabled:opacity-60"
                                        disabled={
                                            Boolean(script.loadError) ||
                                            isPreparing
                                        }
                                        type="button"
                                        onClick={() => void runScript(script)}
                                    >
                                        <Play className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                            {isPreparing
                                                ? "Preparing..."
                                                : script.title}
                                        </span>
                                    </Chip>
                                    <div
                                        className="pointer-events-none absolute
                                            top-1/2 right-1 z-10 flex
                                            -translate-y-1/2 items-center gap-1
                                            opacity-0 transition-opacity
                                            duration-150
                                            group-focus-within:pointer-events-auto
                                            group-focus-within:opacity-100
                                            group-hover:pointer-events-auto
                                            group-hover:opacity-100"
                                    >
                                        <Button
                                            aria-label={`Edit ${script.title}`}
                                            isIconOnly
                                            size="icon-xs"
                                            type="button"
                                            variant="outline"
                                            onPress={() =>
                                                void editScript(script)
                                            }
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            aria-label={`Delete ${script.title}`}
                                            isDisabled={isDeleting}
                                            isIconOnly
                                            size="icon-xs"
                                            type="button"
                                            variant="danger"
                                            onPress={() =>
                                                setScriptPendingDelete(script)
                                            }
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <Surface className="px-3 py-2 text-sm" variant="muted">
                        Create a global script from the sidebar toolbar.
                    </Surface>
                )}
            </Surface>
            {scriptPendingDelete ? (
                <div
                    className="fixed inset-0 z-50 flex items-center
                        justify-center bg-black/35 px-4"
                >
                    <Surface className="w-full max-w-sm px-4 py-4">
                        <h3 className="text-sm font-semibold">Delete script</h3>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Delete "{scriptPendingDelete.title}" from the global
                            script list.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button
                                isDisabled={deleteScriptMutation.isPending}
                                type="button"
                                variant="ghost"
                                onPress={() => setScriptPendingDelete(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                isDisabled={deleteScriptMutation.isPending}
                                type="button"
                                variant="danger"
                                onPress={() =>
                                    void deleteScript(scriptPendingDelete)
                                }
                            >
                                <Trash2 className="h-4 w-4" />
                                {deleteScriptMutation.isPending
                                    ? "Deleting..."
                                    : "Delete"}
                            </Button>
                        </div>
                    </Surface>
                </div>
            ) : null}
        </section>
    );
}
