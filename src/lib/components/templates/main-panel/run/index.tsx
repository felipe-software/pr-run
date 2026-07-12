import {
    Box,
    ChevronRight,
    Package,
    PackagePlus,
    Play,
    Star,
    Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

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
import {
    getPackageScriptKey,
    getProjectFavoriteKeys,
    usePackageScriptFavoritesStore,
} from "@/lib/hooks/store/use-package-script-favorites-store";
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
    const favoriteKeys = usePackageScriptFavoritesStore((store) =>
        getProjectFavoriteKeys(store.favoriteKeysByProject, projectId),
    );
    const toggleFavorite = usePackageScriptFavoritesStore(
        (store) => store.toggleFavorite,
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
    const favoriteScriptKeys = useMemo(
        () => new Set(favoriteKeys),
        [favoriteKeys],
    );
    const favoriteScripts = useMemo(() => {
        const scriptsByKey = new Map(
            (catalog?.packages ?? [])
                .flatMap((group) => group.scripts)
                .map((script) => [getPackageScriptKey(script), script]),
        );

        return favoriteKeys.flatMap((key) => {
            const script = scriptsByKey.get(key);
            return script ? [script] : [];
        });
    }, [catalog?.packages, favoriteKeys]);
    const suggestedScripts = (catalog?.quickScripts ?? []).filter(
        (script) => !favoriteScriptKeys.has(getPackageScriptKey(script)),
    );

    function isPreparingScript(script: PackageScriptInfo) {
        return (
            preparePackageMutation.isPending &&
            preparePackageMutation.variables?.packagePath ===
                script.packagePath &&
            preparePackageMutation.variables?.scriptName === script.name
        );
    }

    return (
        <section className="min-h-0 flex-1 overflow-y-auto pb-3">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-0.5">
                <Surface className="overflow-hidden">
                    <div
                        className="flex flex-wrap items-start justify-between
                            gap-3 px-3 py-2.5"
                    >
                        <div>
                            <div className="flex items-center gap-1.5">
                                <Star
                                    className="text-warning size-4"
                                    fill="currentColor"
                                />
                                <h2 className="text-sm font-semibold">
                                    Favorite scripts
                                </h2>
                            </div>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                                Project scripts kept within one click on every
                                branch.
                            </p>
                        </div>
                        <Button
                            disabled={!catalog || scriptCount === 0}
                            size="xs"
                            variant="outline"
                            onClick={() => setIsPickerOpen(true)}
                        >
                            <PackagePlus className="size-3.5" />
                            Import from package.json
                        </Button>
                    </div>

                    {packageScriptsQuery.isPending ? (
                        <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <Skeleton
                                    className="h-12 min-w-40 flex-1"
                                    key={index}
                                />
                            ))}
                        </div>
                    ) : packageScriptsQuery.error && !catalog ? (
                        <div className="text-danger px-3 pb-2.5 text-xs">
                            {getErrorMessage(packageScriptsQuery.error)} Custom
                            actions and the terminal are still available.
                        </div>
                    ) : favoriteScripts.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
                            {favoriteScripts.map((script) => (
                                <PackageScriptButton
                                    isFavorite
                                    isPreparing={isPreparingScript(script)}
                                    key={getPackageScriptKey(script)}
                                    script={script}
                                    onRun={runPackageScript}
                                    onToggleFavorite={() =>
                                        toggleFavorite(projectId, script)
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <div
                            className="border-border/70 bg-muted/20 mx-2.5
                                mb-2.5 flex min-h-16 items-center
                                justify-between gap-3 rounded-md border
                                border-dashed px-3 py-2"
                        >
                            <div>
                                <p className="text-xs font-medium">
                                    No favorite scripts yet
                                </p>
                                <p
                                    className="text-muted-foreground mt-0.5
                                        text-[11px]"
                                >
                                    Import the scripts you run most often from
                                    this project&apos;s package.json files.
                                </p>
                            </div>
                            <Button
                                disabled={!catalog || scriptCount === 0}
                                size="xs"
                                variant="ghost"
                                onClick={() => setIsPickerOpen(true)}
                            >
                                Choose scripts
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </div>
                    )}
                </Surface>

                <Surface className="overflow-hidden">
                    <div
                        className="flex flex-wrap items-start justify-between
                            gap-3 px-3 py-2.5"
                    >
                        <div>
                            <div className="flex items-center gap-1.5">
                                <Package
                                    className="text-muted-foreground size-4"
                                />
                                <h2 className="text-sm font-semibold">
                                    Suggested scripts
                                </h2>
                            </div>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                                {catalog
                                    ? `${scriptCount} detected · ${catalog.manager}`
                                    : "Detecting scripts from this worktree…"}
                            </p>
                        </div>
                        {catalog && scriptCount > 0 ? (
                            <Button
                                size="xs"
                                variant="outline"
                                onClick={() => setIsPickerOpen(true)}
                            >
                                Browse all scripts
                                <ChevronRight className="size-3.5" />
                            </Button>
                        ) : null}
                    </div>

                    {suggestedScripts.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
                            {suggestedScripts.map((script) => (
                                <PackageScriptButton
                                    isPreparing={isPreparingScript(script)}
                                    key={getPackageScriptKey(script)}
                                    script={script}
                                    onRun={runPackageScript}
                                    onToggleFavorite={() =>
                                        toggleFavorite(projectId, script)
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground px-3 pb-2.5 text-xs">
                            {scriptCount > 0
                                ? "All suggested scripts are already favorites."
                                : packageScriptsQuery.isPending
                                  ? "Detecting scripts from this worktree…"
                                  : "No package scripts were found in this worktree."}
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
            </div>

            {catalog ? (
                <PackageScriptPicker
                    catalog={catalog}
                    favoriteScriptKeys={favoriteScriptKeys}
                    onOpenChange={setIsPickerOpen}
                    onRun={runPackageScript}
                    onToggleFavorite={(script) =>
                        toggleFavorite(projectId, script)
                    }
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

function PackageScriptButton({
    isFavorite = false,
    isPreparing,
    script,
    onRun,
    onToggleFavorite,
}: {
    isFavorite?: boolean;
    isPreparing: boolean;
    onRun: (script: PackageScriptInfo) => Promise<void>;
    onToggleFavorite: () => void;
    script: PackageScriptInfo;
}) {
    return (
        <div
            className="group/script border-border/70 bg-background
                hover:bg-muted/30 flex h-12 min-w-44 flex-1 items-stretch
                overflow-hidden rounded-md border transition-colors"
        >
            <button
                className="focus-visible:ring-ring flex min-w-0 flex-1
                    items-center gap-2 px-2 text-left outline-none
                    focus-visible:ring-2 disabled:opacity-60"
                disabled={isPreparing}
                type="button"
                onClick={() => onRun(script)}
            >
                <span
                    className="bg-primary/10 text-primary flex size-7 shrink-0
                        items-center justify-center rounded-md"
                >
                    {script.packagePath === "." ? (
                        <Play className="size-3.5" />
                    ) : (
                        <Box className="size-3.5" />
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                        {isPreparing ? "Preparing…" : script.name}
                    </span>
                    <span
                        className="text-muted-foreground block truncate
                            font-mono text-[10px]"
                    >
                        {script.packagePath === "."
                            ? script.command
                            : `${script.packageName} · ${script.command}`}
                    </span>
                </span>
            </button>
            <Button
                aria-label={`${isFavorite ? "Remove" : "Add"} ${script.name} ${isFavorite ? "from" : "to"} favorites`}
                className={
                    isFavorite
                        ? "text-warning opacity-100"
                        : `text-muted-foreground opacity-0
                            group-focus-within/script:opacity-100
                            group-hover/script:opacity-100`
                }
                size="icon-xs"
                variant="ghost"
                onClick={onToggleFavorite}
            >
                <Star
                    className="size-3.5"
                    fill={isFavorite ? "currentColor" : "none"}
                />
            </Button>
        </div>
    );
}
