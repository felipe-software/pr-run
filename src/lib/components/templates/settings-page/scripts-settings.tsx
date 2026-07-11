import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

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
import { useScriptsQuery } from "@/lib/hooks/query/use-scripts-query";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { SettingsSection } from "@/lib/components/templates/settings-page/appearance-settings";
import type { ScriptInfo } from "@/types/pr-run";

export function ScriptsSettings({
    onCreateScript,
}: {
    onCreateScript: () => void;
}) {
    const scripts = useScriptsQuery();
    const open = useOpenScriptMutation();
    const remove = useDeleteScriptMutation();
    const [pendingDelete, setPendingDelete] = useState<ScriptInfo | null>(null);

    async function edit(script: ScriptInfo) {
        const [error] = await tryPromise(open.mutateAsync(script.id));
        if (error) toast.error(getErrorMessage(error));
    }
    async function deleteScript() {
        const script = pendingDelete;
        if (!script) return;
        const [error] = await tryPromise(remove.mutateAsync(script.id));
        if (error) {
            toast.error(getErrorMessage(error));
            return;
        }
        toast.success(`${script.title} deleted.`, { timeout: 2400 });
        setPendingDelete(null);
    }

    return (
        <>
            <SettingsSection
                description="Global scripts are available from every branch workspace."
                title="Scripts"
            >
                <Button size="sm" onClick={onCreateScript}>
                    <Plus className="size-3.5" />
                    Create script
                </Button>
                {scripts.isPending ? (
                    <p className="text-muted-foreground text-sm">
                        Loading scripts...
                    </p>
                ) : scripts.error && !scripts.data ? (
                    <p className="text-destructive text-sm">
                        {getErrorMessage(scripts.error)}
                    </p>
                ) : (
                    <div className="grid gap-2">
                        {(scripts.data ?? []).map((script) => (
                            <article
                                className="bg-card flex items-center
                                    justify-between gap-3 rounded-lg border px-3
                                    py-2"
                                key={script.id}
                            >
                                <div>
                                    <h3 className="text-sm font-medium">
                                        {script.title}
                                    </h3>
                                    <p
                                        className="text-muted-foreground
                                            font-mono text-xs"
                                    >
                                        {script.fileName}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        aria-label={`Edit ${script.title}`}
                                        size="icon-xs"
                                        variant="ghost"
                                        onClick={() => edit(script)}
                                    >
                                        <Pencil className="size-3.5" />
                                    </Button>
                                    <Button
                                        aria-label={`Delete ${script.title}`}
                                        size="icon-xs"
                                        variant="ghost"
                                        onClick={() => setPendingDelete(script)}
                                    >
                                        <Trash2
                                            className="text-destructive
                                                size-3.5"
                                        />
                                    </Button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </SettingsSection>
            <Dialog
                open={Boolean(pendingDelete)}
                onOpenChange={(isOpen) => {
                    if (!isOpen && !remove.isPending) {
                        setPendingDelete(null);
                    }
                }}
            >
                <DialogPopup showCloseButton={!remove.isPending}>
                    <DialogHeader>
                        <DialogTitle>Delete script</DialogTitle>
                        <DialogDescription>
                            This removes {pendingDelete?.title ?? "this script"}{" "}
                            from the global script list.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            disabled={remove.isPending}
                            variant="ghost"
                            onClick={() => setPendingDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={remove.isPending}
                            variant="destructive"
                            onClick={deleteScript}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogPopup>
            </Dialog>
        </>
    );
}
