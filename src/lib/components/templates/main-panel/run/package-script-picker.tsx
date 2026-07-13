import { Box, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";

import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/lib/components/ui/dialog";
import { Input } from "@/lib/components/ui/input";
import { Button } from "@/lib/components/ui/button";
import { filterPackageScriptGroups } from "@/lib/components/templates/main-panel/run/run-script-derivations";
import { getPackageScriptKey } from "@/lib/hooks/store/use-package-script-favorites-store";
import type { PackageScriptCatalog, PackageScriptInfo } from "@/types/pr-run";

type PackageScriptPickerProps = {
    catalog: PackageScriptCatalog;
    favoriteScriptKeys: Set<string>;
    onOpenChange: (open: boolean) => void;
    onRun: (script: PackageScriptInfo) => void;
    onToggleFavorite: (script: PackageScriptInfo) => void;
    open: boolean;
};

export function PackageScriptPicker({
    catalog,
    favoriteScriptKeys,
    onOpenChange,
    onRun,
    onToggleFavorite,
    open,
}: PackageScriptPickerProps) {
    const [search, setSearch] = useState("");
    const groups = useMemo(
        () => filterPackageScriptGroups(catalog.packages, search),
        [catalog.packages, search],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPopup className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Package scripts</DialogTitle>
                    <DialogDescription>
                        Search scripts from the root package and declared
                        workspaces. Commands run with {catalog.manager}.
                    </DialogDescription>
                </DialogHeader>
                <DialogPanel className="flex min-h-0 flex-col gap-3">
                    <div className="relative">
                        <Search
                            className="text-muted-foreground pointer-events-none
                                absolute top-1/2 left-2.5 z-10 size-3.5
                                -translate-y-1/2"
                        />
                        <Input
                            autoFocus
                            className="[&_input]:pl-8"
                            placeholder="Search scripts or commands…"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <div className="max-h-[26rem] overflow-y-auto pr-1">
                        {groups.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {groups.map((group) => (
                                    <section key={group.path}>
                                        <div
                                            className="text-muted-foreground
                                                mb-1 flex items-center gap-1.5
                                                px-1 text-[11px] font-semibold"
                                        >
                                            <Box className="size-3" />
                                            <span>{group.name}</span>
                                            <span
                                                className="font-mono
                                                    font-normal"
                                            >
                                                {group.path}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            {group.scripts.map((script) => {
                                                const isFavorite =
                                                    favoriteScriptKeys.has(
                                                        getPackageScriptKey(
                                                            script,
                                                        ),
                                                    );

                                                return (
                                                    <div
                                                        className="group/script
                                                            hover:bg-muted/40
                                                            flex min-w-0
                                                            items-center
                                                            rounded-md
                                                            transition-colors"
                                                        key={`${script.packagePath}:${script.name}`}
                                                    >
                                                        <button
                                                            className="focus-visible:ring-ring
                                                                flex h-9 min-w-0
                                                                flex-1
                                                                items-center
                                                                gap-3 rounded-md
                                                                px-2 text-left
                                                                outline-none
                                                                focus-visible:ring-2"
                                                            type="button"
                                                            onClick={() => {
                                                                onRun(script);
                                                                onOpenChange(
                                                                    false,
                                                                );
                                                            }}
                                                        >
                                                            <span
                                                                className="w-32
                                                                    shrink-0
                                                                    truncate
                                                                    text-sm
                                                                    font-medium"
                                                            >
                                                                {script.name}
                                                            </span>
                                                            <span
                                                                className="text-muted-foreground
                                                                    min-w-0
                                                                    flex-1
                                                                    truncate
                                                                    font-mono
                                                                    text-[11px]"
                                                            >
                                                                {script.command}
                                                            </span>
                                                        </button>
                                                        <Button
                                                            aria-label={`${isFavorite ? "Remove" : "Add"} ${script.name} ${isFavorite ? "from" : "to"} favorites`}
                                                            className={
                                                                isFavorite
                                                                    ? `text-warning
                                                                        opacity-100`
                                                                    : `text-muted-foreground
                                                                        opacity-0
                                                                        group-focus-within/script:opacity-100
                                                                        group-hover/script:opacity-100`
                                                            }
                                                            size="icon-xs"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                onToggleFavorite(
                                                                    script,
                                                                )
                                                            }
                                                        >
                                                            <Star
                                                                className="size-3.5"
                                                                fill={
                                                                    isFavorite
                                                                        ? "currentColor"
                                                                        : "none"
                                                                }
                                                            />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <div
                                className="text-muted-foreground py-12
                                    text-center text-sm"
                            >
                                No scripts match “{search}”.
                            </div>
                        )}
                    </div>
                </DialogPanel>
            </DialogPopup>
        </Dialog>
    );
}
