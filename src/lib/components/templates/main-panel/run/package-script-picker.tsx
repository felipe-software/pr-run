import { Box, Search } from "lucide-react";
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
import type { PackageScriptCatalog, PackageScriptInfo } from "@/types/pr-run";

type PackageScriptPickerProps = {
    catalog: PackageScriptCatalog;
    onOpenChange: (open: boolean) => void;
    onRun: (script: PackageScriptInfo) => void;
    open: boolean;
};

export function PackageScriptPicker({
    catalog,
    onOpenChange,
    onRun,
    open,
}: PackageScriptPickerProps) {
    const [search, setSearch] = useState("");
    const normalizedSearch = search.trim().toLowerCase();
    const groups = useMemo(
        () =>
            catalog.packages
                .map((group) => ({
                    ...group,
                    scripts: group.scripts.filter((script) =>
                        `${script.name} ${script.command} ${script.packageName}`
                            .toLowerCase()
                            .includes(normalizedSearch),
                    ),
                }))
                .filter((group) => group.scripts.length > 0),
        [catalog.packages, normalizedSearch],
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
                <DialogPanel className="grid min-h-0 gap-3">
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
                            <div className="grid gap-4">
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
                                        <div className="grid gap-0.5">
                                            {group.scripts.map((script) => (
                                                <button
                                                    className="hover:bg-muted/40
                                                        focus-visible:ring-ring
                                                        grid min-w-0
                                                        grid-cols-[minmax(0,10rem)_1fr]
                                                        items-center gap-3
                                                        rounded-md px-2 py-1.5
                                                        text-left outline-none
                                                        focus-visible:ring-2"
                                                    key={`${script.packagePath}:${script.name}`}
                                                    type="button"
                                                    onClick={() => {
                                                        onRun(script);
                                                        onOpenChange(false);
                                                    }}
                                                >
                                                    <span
                                                        className="truncate
                                                            text-sm font-medium"
                                                    >
                                                        {script.name}
                                                    </span>
                                                    <span
                                                        className="text-muted-foreground
                                                            truncate font-mono
                                                            text-[11px]"
                                                    >
                                                        {script.command}
                                                    </span>
                                                </button>
                                            ))}
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
