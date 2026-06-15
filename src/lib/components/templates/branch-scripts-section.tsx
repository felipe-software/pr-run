import { Card, Spinner, Surface, toast } from "@heroui/react";
import { Pencil, Play, Plus, Trash2 } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { Chip } from "@/lib/components/atoms/chip";
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
        if (!window.confirm(`Delete "${script.title}"?`)) {
            return;
        }

        const [error] = await tryPromise(
            deleteScriptMutation.mutateAsync(script.id),
        );

        if (error) {
            toast.danger(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        toast.success(`${script.title} deleted.`, { timeout: 2400 });
    }

    return (
        <section className="min-w-0 shrink-0">
            <Card className="rounded-lg border border-border bg-surface py-1! px-2">
                <Card.Content className="px-0 py-0">
                    <div className="mb-0 flex items-center justify-between gap-1">
                        <h2 className="text-base font-semibold">Scripts</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                                {(scriptsQuery.data ?? []).length} available
                            </span>
                            <Button
                                className="h-7"
                                type="button"
                                onPress={onCreateScript}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Create script
                            </Button>
                        </div>
                    </div>

                    {scriptsQuery.isPending ? (
                        <Surface className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-1 text-sm text-muted-foreground">
                            <Spinner size="sm" /> Loading scripts...
                        </Surface>
                    ) : scriptsQuery.error ? (
                        <Surface className="rounded-md border border-danger/25 bg-danger/10 px-3 py-1 text-sm text-danger">
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
                                    deleteScriptMutation.variables ===
                                        script.id;

                                return (
                                    <div
                                        className="group relative self-start"
                                        key={script.id}
                                    >
                                        <Chip
                                            as="button"
                                            className="max-w-60 cursor-pointer justify-start gap-1.5 pr-[54px] text-left transition hover:bg-muted/20 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60"
                                            disabled={
                                                Boolean(script.loadError) ||
                                                isPreparing
                                            }
                                            type="button"
                                            onClick={() =>
                                                void runScript(script)
                                            }
                                        >
                                            <Play className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">
                                                {script.title}
                                            </span>
                                        </Chip>
                                        <div className="pointer-events-none absolute top-1/2 right-1 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                                            <Button
                                                aria-label={`Edit ${script.title}`}
                                                className="h-6 w-6 min-w-6 border-border/80 bg-surface px-0 shadow-sm"
                                                isIconOnly
                                                type="button"
                                                onPress={() =>
                                                    void editScript(script)
                                                }
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                aria-label={`Delete ${script.title}`}
                                                className="h-6 w-6 min-w-6 border-border/80 bg-surface px-0 text-danger shadow-sm"
                                                isDisabled={isDeleting}
                                                isIconOnly
                                                type="button"
                                                onPress={() =>
                                                    void deleteScript(script)
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
                        <Surface className="rounded-md border border-border bg-muted/10 px-3 py-1 text-sm text-muted-foreground">
                            Create a global script from the sidebar toolbar.
                        </Surface>
                    )}
                </Card.Content>
            </Card>
        </section>
    );
}
