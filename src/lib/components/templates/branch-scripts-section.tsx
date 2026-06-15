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
    onRunCommand: (command: string) => void;
};

export function BranchScriptsSection({
    branchName,
    projectId,
    onCreateScript,
    onRunCommand,
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

        onRunCommand(result.command);
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
            <Card className="rounded-lg border border-border bg-surface">
                <Card.Content className="p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="text-base font-semibold">Scripts</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                                {(scriptsQuery.data ?? []).length} available
                            </span>
                            <Button
                                className="h-8"
                                type="button"
                                onPress={onCreateScript}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Create script
                            </Button>
                        </div>
                    </div>

                    {scriptsQuery.isPending ? (
                        <Surface className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                            <Spinner size="sm" /> Loading scripts...
                        </Surface>
                    ) : scriptsQuery.error ? (
                        <Surface className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
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
                                        className="group flex items-center gap-1 self-start"
                                        key={script.id}
                                    >
                                        <Chip
                                            as="button"
                                            className="max-w-60 cursor-pointer justify-between gap-1.5 text-left transition hover:bg-muted/20 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-60"
                                            disabled={
                                                Boolean(script.loadError) ||
                                                isPreparing
                                            }
                                            type="button"
                                            onClick={() =>
                                                void runScript(script)
                                            }
                                        >
                                            <span className="truncate">
                                                {script.title}
                                            </span>
                                            <Play className="h-3.5 w-3.5 shrink-0" />
                                        </Chip>
                                        <div className="flex max-w-0 items-center gap-1 overflow-hidden opacity-0 transition-all duration-150 group-hover:max-w-20 group-hover:opacity-100 group-focus-within:max-w-20 group-focus-within:opacity-100">
                                            <Button
                                                aria-label={`Edit ${script.title}`}
                                                className="h-7 w-7 min-w-7 px-0"
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
                                                className="h-7 w-7 min-w-7 px-0 text-danger"
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
                        <Surface className="rounded-md border border-border bg-muted/10 px-3 py-2 text-sm text-muted-foreground">
                            Create a global script from the sidebar toolbar.
                        </Surface>
                    )}
                </Card.Content>
            </Card>
        </section>
    );
}
