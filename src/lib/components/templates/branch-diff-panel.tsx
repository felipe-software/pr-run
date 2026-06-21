import { parsePatchFiles } from "@pierre/diffs";
import { FileDiff, type FileDiffMetadata } from "@pierre/diffs/react";
import { useEffect, useMemo, useState } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { Button } from "@/lib/components/atoms/button";
import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { BranchDiffTree } from "@/lib/components/molecules/branch-diff-tree";
import { useBranchDiffQuery } from "@/lib/hooks/query/use-branch-diff-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type BranchDiffPanelProps = {
    baseBranchName?: string;
    branchName: string;
    projectId: string;
};

const DIFF_SIDEBAR_MIN_WIDTH = 168;
const DIFF_SIDEBAR_MAX_WIDTH = 320;
const DIFF_SIDEBAR_DEFAULT_WIDTH = 208;
const DIFF_SIDEBAR_WIDTH_STORAGE_KEY = "pr-run.diff.sidebar.width";
const DIFF_WRAP_LINES_STORAGE_KEY = "pr-run.diff.wrap-lines";
const DIFF_VIEW_MODE_STORAGE_KEY = "pr-run.diff.view-mode";

export function BranchDiffPanel({
    baseBranchName,
    branchName,
    projectId,
}: BranchDiffPanelProps) {
    const [selectedPath, setSelectedPath] = useState<string>();
    const [shouldWrapLines, setShouldWrapLines] = useState(
        () => localStorage.getItem(DIFF_WRAP_LINES_STORAGE_KEY) === "true",
    );
    const [isUnifiedView, setIsUnifiedView] = useState(
        () => localStorage.getItem(DIFF_VIEW_MODE_STORAGE_KEY) === "unified",
    );
    const [diffSidebarWidth, setDiffSidebarWidth] = useState(() => {
        const stored = Number(
            localStorage.getItem(DIFF_SIDEBAR_WIDTH_STORAGE_KEY),
        );

        return Number.isFinite(stored)
            ? clamp(stored, DIFF_SIDEBAR_MIN_WIDTH, DIFF_SIDEBAR_MAX_WIDTH)
            : DIFF_SIDEBAR_DEFAULT_WIDTH;
    });
    const [isResizingDiffSidebar, setIsResizingDiffSidebar] = useState(false);
    const branchDiffQuery = useBranchDiffQuery(
        projectId,
        branchName,
        baseBranchName,
    );
    const isAwaitingSshPassphrase = isHandledSshPromptError(
        branchDiffQuery.error,
    );

    useEffect(() => {
        setSelectedPath(undefined);
    }, [branchName, projectId]);

    useEffect(() => {
        if (!isResizingDiffSidebar) {
            return;
        }

        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;

        function handlePointerMove(event: PointerEvent) {
            const body = document.body.getBoundingClientRect();
            const nextWidth = event.clientX - body.left - 12;

            setDiffSidebarWidth(
                clamp(
                    nextWidth,
                    DIFF_SIDEBAR_MIN_WIDTH,
                    DIFF_SIDEBAR_MAX_WIDTH,
                ),
            );
        }

        function handlePointerUp() {
            setIsResizingDiffSidebar(false);
        }

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);

        return () => {
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [isResizingDiffSidebar]);

    useEffect(() => {
        localStorage.setItem(
            DIFF_SIDEBAR_WIDTH_STORAGE_KEY,
            String(diffSidebarWidth),
        );
    }, [diffSidebarWidth]);

    useEffect(() => {
        localStorage.setItem(
            DIFF_WRAP_LINES_STORAGE_KEY,
            String(shouldWrapLines),
        );
    }, [shouldWrapLines]);

    useEffect(() => {
        localStorage.setItem(
            DIFF_VIEW_MODE_STORAGE_KEY,
            isUnifiedView ? "unified" : "split",
        );
    }, [isUnifiedView]);

    useEffect(() => {
        if (!isAwaitingSshPassphrase) {
            return;
        }

        useSshPassphraseStore
            .getState()
            .setRetryAction(() =>
                branchDiffQuery.refetch().then(() => undefined),
            );
    }, [branchDiffQuery, isAwaitingSshPassphrase]);

    useEffect(() => {
        const firstPath = branchDiffQuery.data?.files[0]?.path;

        if (!firstPath) {
            return;
        }

        setSelectedPath((current) => {
            if (
                current &&
                branchDiffQuery.data?.files.some(
                    (file) => file.path === current,
                )
            ) {
                return current;
            }

            return firstPath;
        });
    }, [branchDiffQuery.data]);

    const fileDiffs = useMemo(
        () => parseFileDiffs(branchDiffQuery.data?.patch ?? "", branchName),
        [branchName, branchDiffQuery.data?.patch],
    );
    const selectedFileDiff = useMemo(
        () => findSelectedFileDiff(fileDiffs, selectedPath),
        [fileDiffs, selectedPath],
    );
    const error = branchDiffQuery.error
        ? getErrorMessage(branchDiffQuery.error)
        : undefined;

    if (branchDiffQuery.isPending) {
        return (
            <Surface
                className="grid min-h-0 flex-1 grid-cols-[13rem_minmax(0,1fr)]
                    overflow-hidden max-[900px]:grid-cols-1"
            >
                <div
                    className="border-border/70 grid content-start gap-2
                        border-r px-3 py-3 max-[900px]:border-r-0
                        max-[900px]:border-b"
                >
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-10/12" />
                    <Skeleton className="h-6 w-11/12" />
                </div>
                <div className="grid content-start gap-2 px-3 py-3">
                    <Skeleton className="h-4 w-56" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-10/12" />
                    <Skeleton className="h-3 w-full" />
                </div>
            </Surface>
        );
    }

    if (isAwaitingSshPassphrase) {
        return (
            <Surface className="px-3 py-2 text-sm" variant="muted">
                Waiting for SSH passphrase...
            </Surface>
        );
    }

    if (error) {
        return (
            <Surface className="px-3 py-2 text-sm" variant="danger">
                {error}
            </Surface>
        );
    }

    if (!branchDiffQuery.data || branchDiffQuery.data.files.length === 0) {
        return (
            <Surface className="min-h-48" variant="muted">
                <EmptyState
                    description="The selected branch does not change files compared with its base."
                    title="No changed files"
                />
            </Surface>
        );
    }

    return (
        <section
            className="border-border bg-surface flex h-full min-h-0 flex-1
                flex-col overflow-hidden rounded-lg border"
        >
            <div
                className="border-border bg-background/70 flex min-h-11 shrink-0
                    items-center justify-between gap-4 border-b px-2.5 py-2
                    max-[900px]:flex-col max-[900px]:items-start
                    max-[900px]:gap-2"
            >
                <div
                    className="text-foreground min-w-0 overflow-hidden font-mono
                        text-[11px] text-ellipsis whitespace-nowrap"
                >
                    <span>{selectedPath ?? "Diff"}</span>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="border-border/80 bg-muted/20 flex rounded-md
                            border p-0.5"
                    >
                        <button
                            className={
                                isUnifiedView
                                    ? `text-muted-foreground h-6 rounded px-2
                                        text-xs font-medium`
                                    : `bg-surface text-foreground h-6 rounded
                                        px-2 text-xs font-semibold shadow-sm/5`
                            }
                            type="button"
                            onClick={() => setIsUnifiedView(false)}
                        >
                            Split
                        </button>
                        <button
                            className={
                                isUnifiedView
                                    ? `bg-surface text-foreground h-6 rounded
                                        px-2 text-xs font-semibold shadow-sm/5`
                                    : `text-muted-foreground h-6 rounded px-2
                                        text-xs font-medium`
                            }
                            type="button"
                            onClick={() => setIsUnifiedView(true)}
                        >
                            Unified
                        </button>
                    </div>
                    <Button
                        size="xs"
                        type="button"
                        variant={shouldWrapLines ? "outline" : "ghost"}
                        onPress={() => setShouldWrapLines((value) => !value)}
                    >
                        Wrap
                    </Button>
                </div>
            </div>
            <div
                className="grid min-h-0 flex-1 overflow-hidden
                    max-[900px]:grid-cols-1"
                style={{
                    gridTemplateColumns: `${diffSidebarWidth}px 8px minmax(0, 1fr)`,
                }}
            >
                <aside
                    className="bg-background/70 max-[900px]:border-border
                        min-w-0 overflow-auto px-1.5 py-2
                        max-[900px]:max-h-[260px] max-[900px]:border-b"
                >
                    <div
                        className="text-muted-foreground mb-2 flex items-center
                            justify-between gap-3 text-[11px] font-bold
                            tracking-[0.04em] uppercase"
                    >
                        <span>Changed files</span>
                        <span>{branchDiffQuery.data.files.length}</span>
                    </div>
                    <BranchDiffTree
                        files={branchDiffQuery.data.files}
                        selectedPath={selectedPath}
                        onSelectFile={setSelectedPath}
                    />
                </aside>
                <div
                    aria-hidden="true"
                    className="after:bg-border relative cursor-col-resize
                        touch-none after:absolute after:top-0 after:bottom-0
                        after:left-[3px] after:w-px after:content-['']
                        max-[900px]:hidden"
                    onPointerDown={() => setIsResizingDiffSidebar(true)}
                />

                <div className="bg-background min-w-0 overflow-auto">
                    {selectedFileDiff ? (
                        <FileDiff
                            disableWorkerPool
                            fileDiff={selectedFileDiff}
                            options={{
                                diffIndicators: "bars",
                                diffStyle: isUnifiedView ? "unified" : "split",
                                hunkSeparators: "line-info-basic",
                                lineDiffType: "word",
                                overflow: shouldWrapLines ? "wrap" : "scroll",
                                stickyHeader: true,
                                themeType: "system",
                            }}
                        />
                    ) : (
                        <Surface
                            className="m-3 px-3 py-2 text-sm"
                            variant="muted"
                        >
                            Select a changed file.
                        </Surface>
                    )}
                </div>
            </div>
        </section>
    );
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function parseFileDiffs(patch: string, branchName: string) {
    if (!patch.trim()) {
        return [];
    }

    return parsePatchFiles(patch, branchName).flatMap((item) => item.files);
}

function findSelectedFileDiff(
    fileDiffs: FileDiffMetadata[],
    selectedPath: string | undefined,
) {
    return (
        fileDiffs.find(
            (fileDiff) =>
                fileDiff.name === selectedPath ||
                fileDiff.prevName === selectedPath,
        ) ?? fileDiffs[0]
    );
}
