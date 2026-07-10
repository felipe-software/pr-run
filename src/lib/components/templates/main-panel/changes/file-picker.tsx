import { File, Search } from "lucide-react";
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
import { cn } from "@/lib/utils/cn";
import type { BranchDiffFile } from "@/types/pr-run";

type FilePickerProps = {
    files: BranchDiffFile[];
    onOpenChange: (open: boolean) => void;
    onSelect: (path: string) => void;
    open: boolean;
    selectedPath?: string;
};

export function FilePicker({
    files,
    onOpenChange,
    onSelect,
    open,
    selectedPath,
}: FilePickerProps) {
    const [search, setSearch] = useState("");
    const filteredFiles = useMemo(() => {
        const query = search.trim().toLowerCase();
        return query
            ? files.filter((file) => file.path.toLowerCase().includes(query))
            : files;
    }, [files, search]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPopup className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Changed files</DialogTitle>
                    <DialogDescription>
                        Search {files.length} changed files and jump directly to
                        one.
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
                            placeholder="Filter by file path…"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <div className="max-h-[28rem] overflow-y-auto">
                        {filteredFiles.map((file) => {
                            const parts = file.path.split("/");
                            const name = parts.pop() ?? file.path;
                            const parent = parts.join("/");

                            return (
                                <button
                                    className={cn(
                                        `hover:bg-muted/30
                                        focus-visible:ring-ring grid w-full
                                        min-w-0
                                        grid-cols-[1rem_minmax(0,1fr)_auto]
                                        items-center gap-2 rounded-md px-2
                                        py-1.5 text-left outline-none
                                        focus-visible:ring-2`,
                                        selectedPath === file.path &&
                                            "bg-muted/40",
                                    )}
                                    key={file.path}
                                    type="button"
                                    onClick={() => {
                                        onSelect(file.path);
                                        onOpenChange(false);
                                    }}
                                >
                                    <File
                                        className="text-muted-foreground
                                            size-3.5"
                                    />
                                    <span className="min-w-0">
                                        <span
                                            className="block truncate text-xs
                                                font-semibold"
                                        >
                                            {name}
                                        </span>
                                        {parent ? (
                                            <span
                                                className="text-muted-foreground
                                                    block truncate font-mono
                                                    text-[10px]"
                                            >
                                                {parent}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span
                                        className="font-mono text-[10px]
                                            tabular-nums"
                                    >
                                        <span className="text-success">
                                            +{file.additions}
                                        </span>{" "}
                                        <span className="text-danger">
                                            −{file.deletions}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </DialogPanel>
            </DialogPopup>
        </Dialog>
    );
}
