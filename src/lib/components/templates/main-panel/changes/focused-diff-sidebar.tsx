import { File, FileMinus2, FilePlus2, FileSymlink, Search } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";

import { Input } from "@/lib/components/ui/input";
import { FileCommitStack } from "@/lib/components/templates/main-panel/changes/file-commit-stack";
import { useResizableSize } from "@/lib/hooks/use-resizable-size";
import { cn } from "@/lib/utils/cn";
import type { BranchDiffFile } from "@/types/pr-run";

const SIDEBAR_DEFAULT_WIDTH = 244;
const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 420;

export function FocusedDiffSidebar({
    files,
    selectedPath,
    onSelect,
}: {
    files: BranchDiffFile[];
    onSelect: (path: string) => void;
    selectedPath?: string;
}) {
    const [search, setSearch] = useState("");
    const viewportRef = useRef<HTMLElement>(null);
    const { beginResize, setSize, size } = useResizableSize({
        axis: "horizontal",
        defaultSize: SIDEBAR_DEFAULT_WIDTH,
        edge: "right",
        maxSize: getFocusedSidebarMaximumWidth,
        minSize: SIDEBAR_MIN_WIDTH,
        storageKey: "pr-run.diff.focused-sidebar-width",
    });
    const filteredFiles = useMemo(() => {
        const query = search.trim().toLowerCase();
        return query
            ? files.filter((file) => file.path.toLowerCase().includes(query))
            : files;
    }, [files, search]);
    const virtualizer = useVirtualizer({
        count: filteredFiles.length,
        estimateSize: () => 40,
        getScrollElement: () => viewportRef.current,
        overscan: 8,
    });

    return (
        <aside
            aria-label="Changed files"
            className="border-border bg-surface relative flex min-h-0 shrink-0
                flex-col border-r"
            style={{ width: size }}
        >
            <div className="border-border border-b p-2">
                <div className="relative">
                    <Search
                        className="text-muted-foreground pointer-events-none
                            absolute top-1/2 left-2.5 z-10 size-3.5
                            -translate-y-1/2"
                    />
                    <Input
                        aria-label="Filter changed files"
                        className="[&_input]:h-7 [&_input]:pl-8
                            [&_input]:text-xs"
                        placeholder={`Filter ${files.length} files…`}
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </div>
            </div>
            <nav
                aria-label="Files in this diff"
                className="min-h-0 flex-1 overflow-y-auto p-1.5"
                ref={viewportRef}
            >
                <div
                    className="relative w-full"
                    style={{ height: virtualizer.getTotalSize() }}
                >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const file = filteredFiles[virtualRow.index];

                        if (!file) {
                            return null;
                        }

                        const parts = file.path.split("/");
                        const name = parts.pop() ?? file.path;
                        const parent = parts.join("/");
                        const Icon = fileIcon(file.status);

                        return (
                            <div
                                className="absolute top-0 left-0 w-full pb-0.5"
                                data-index={virtualRow.index}
                                key={file.path}
                                ref={virtualizer.measureElement}
                                style={{
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                <button
                                    aria-current={
                                        selectedPath === file.path
                                            ? "true"
                                            : undefined
                                    }
                                    className={cn(
                                        `hover:bg-muted/40
                                        focus-visible:ring-ring flex w-full
                                        min-w-0 items-center gap-2 rounded-md
                                        px-2 py-1.5 text-left transition-colors
                                        outline-none focus-visible:ring-2`,
                                        selectedPath === file.path &&
                                            "bg-muted/60 text-foreground",
                                    )}
                                    title={file.path}
                                    type="button"
                                    onClick={() => onSelect(file.path)}
                                >
                                    <Icon
                                        className={cn(
                                            "size-3.5 shrink-0",
                                            fileIconTone(file.status),
                                        )}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span
                                            className="block truncate text-xs
                                                font-medium"
                                        >
                                            {name}
                                        </span>
                                        {parent ? (
                                            <span
                                                className="text-muted-foreground
                                                    block truncate font-mono
                                                    text-[9px]"
                                            >
                                                {parent}
                                            </span>
                                        ) : null}
                                    </span>
                                    <span
                                        className="hidden shrink-0 font-mono
                                            text-[9px] tabular-nums
                                            min-[1100px]:flex
                                            min-[1100px]:items-center
                                            min-[1100px]:gap-1"
                                    >
                                        <span className="text-success">
                                            +{file.additions}
                                        </span>
                                        <span className="text-danger">
                                            −{file.deletions}
                                        </span>
                                    </span>
                                    <FileCommitStack
                                        commits={file.commits}
                                        compact
                                    />
                                </button>
                            </div>
                        );
                    })}
                </div>
                {filteredFiles.length === 0 ? (
                    <p
                        className="text-muted-foreground px-2 py-8 text-center
                            text-xs"
                    >
                        No changed files match “{search}”.
                    </p>
                ) : null}
            </nav>
            <div
                aria-label="Resize changed files sidebar"
                aria-orientation="vertical"
                aria-valuemax={getFocusedSidebarMaximumWidth()}
                aria-valuemin={SIDEBAR_MIN_WIDTH}
                aria-valuenow={Math.round(size)}
                className="hover:bg-primary/40 focus-visible:bg-primary/50
                    absolute top-0 right-0 bottom-0 z-20 w-1.5 translate-x-1/2
                    cursor-col-resize transition-colors outline-none"
                role="separator"
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === "ArrowLeft") {
                        event.preventDefault();
                        setSize(size - 16);
                    } else if (event.key === "ArrowRight") {
                        event.preventDefault();
                        setSize(size + 16);
                    }
                }}
                onPointerDown={beginResize}
            />
        </aside>
    );
}

function getFocusedSidebarMaximumWidth() {
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(240, window.innerWidth * 0.45));
}

function fileIcon(status: BranchDiffFile["status"]) {
    if (status === "added") return FilePlus2;
    if (status === "deleted") return FileMinus2;
    if (status === "renamed") return FileSymlink;
    return File;
}

function fileIconTone(status: BranchDiffFile["status"]) {
    if (status === "added") return "text-success";
    if (status === "deleted") return "text-danger";
    if (status === "renamed") return "text-warning";
    return "text-muted-foreground";
}
