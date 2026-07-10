import { Pencil, Play, Plus, Trash2 } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import type { ScriptInfo } from "@/types/pr-run";

type CustomActionsProps = {
    deletingId?: string;
    onCreate: () => void;
    onDelete: (script: ScriptInfo) => void;
    onEdit: (script: ScriptInfo) => void;
    onRun: (script: ScriptInfo) => void;
    preparingId?: string;
    scripts: ScriptInfo[];
};

export function CustomActions({
    deletingId,
    onCreate,
    onDelete,
    onEdit,
    onRun,
    preparingId,
    scripts,
}: CustomActionsProps) {
    return (
        <section className="border-border/70 border-t px-2.5 pt-2 pb-2.5">
            <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-xs font-semibold">Custom actions</h3>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                        Reusable PR-run actions enabled for the Run page.
                    </p>
                </div>
                <Button size="xs" variant="ghost" onClick={onCreate}>
                    <Plus className="size-3.5" />
                    Create action
                </Button>
            </div>
            {scripts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {scripts.map((script) => (
                        <div
                            className="group border-border/70 bg-background flex
                                h-8 min-w-0 items-center rounded-md border"
                            key={script.id}
                        >
                            <button
                                className="hover:bg-muted/30 flex h-full min-w-0
                                    items-center gap-1.5 rounded-l-md px-2
                                    text-xs font-medium transition-colors
                                    disabled:opacity-50"
                                disabled={
                                    Boolean(script.loadError) ||
                                    preparingId === script.id
                                }
                                type="button"
                                onClick={() => onRun(script)}
                            >
                                <Play className="size-3.5" />
                                <span className="max-w-44 truncate">
                                    {preparingId === script.id
                                        ? "Preparing…"
                                        : script.title}
                                </span>
                            </button>
                            <div
                                className="border-border/70 flex border-l
                                    opacity-0 transition-opacity
                                    group-focus-within:opacity-100
                                    group-hover:opacity-100"
                            >
                                <Button
                                    aria-label={`Edit ${script.title}`}
                                    size="icon-xs"
                                    variant="ghost"
                                    onClick={() => onEdit(script)}
                                >
                                    <Pencil className="size-3" />
                                </Button>
                                <Button
                                    aria-label={`Delete ${script.title}`}
                                    disabled={deletingId === script.id}
                                    size="icon-xs"
                                    variant="ghost"
                                    onClick={() => onDelete(script)}
                                >
                                    <Trash2 className="text-danger size-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground text-xs">
                    No custom actions are enabled for this page.
                </p>
            )}
        </section>
    );
}
