import { parsePatchFiles } from "@pierre/diffs";
import { FileDiff, type FileDiffMetadata } from "@pierre/diffs/react";
import { Spinner, Surface } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";

import { isHandledSshPromptError } from "@/lib/api";
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

export function BranchDiffPanel({
    baseBranchName,
    branchName,
    projectId,
}: BranchDiffPanelProps) {
    const [selectedPath, setSelectedPath] = useState<string>();
    const [shouldWrapLines, setShouldWrapLines] = useState(false);
    const [isUnifiedView, setIsUnifiedView] = useState(false);
    const [diffSidebarWidth, setDiffSidebarWidth] = useState(
        DIFF_SIDEBAR_DEFAULT_WIDTH,
    );
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

        function handleMouseMove(event: MouseEvent) {
            const body = document.body.getBoundingClientRect();
            const nextWidth = event.clientX - body.left - 18;

            setDiffSidebarWidth(
                clamp(
                    nextWidth,
                    DIFF_SIDEBAR_MIN_WIDTH,
                    DIFF_SIDEBAR_MAX_WIDTH,
                ),
            );
        }

        function handleMouseUp() {
            setIsResizingDiffSidebar(false);
        }

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizingDiffSidebar]);

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
            <Surface className="flex items-center gap-2 rounded-md text-sm text-muted-foreground">
                <Spinner size="sm" />
                Loading diff...
            </Surface>
        );
    }

    if (isAwaitingSshPassphrase) {
        return (
            <Surface className="rounded-md text-sm text-muted-foreground">
                Waiting for SSH passphrase...
            </Surface>
        );
    }

    if (error) {
        return (
            <Surface className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
            </Surface>
        );
    }

    if (!branchDiffQuery.data || branchDiffQuery.data.files.length === 0) {
        return (
            <Surface className="rounded-md text-sm text-muted-foreground">
                No changed files.
            </Surface>
        );
    }

    return (
        <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface">
            <div className="flex min-h-[42px] shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-2.5 py-[7px] max-[900px]:flex-col max-[900px]:items-start max-[900px]:gap-2">
                <div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-foreground">
                    <span>{selectedPath ?? "Diff"}</span>
                </div>
                <div className="flex items-center gap-3.5">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs leading-none text-muted-foreground">
                        <input
                            className="m-0 h-3.5 w-3.5 accent-green-400"
                            checked={shouldWrapLines}
                            type="checkbox"
                            onChange={(event) =>
                                setShouldWrapLines(event.target.checked)
                            }
                        />
                        <span>Wrap lines</span>
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs leading-none text-muted-foreground">
                        <input
                            className="m-0 h-3.5 w-3.5 accent-green-400"
                            checked={isUnifiedView}
                            type="checkbox"
                            onChange={(event) =>
                                setIsUnifiedView(event.target.checked)
                            }
                        />
                        <span>Unified view</span>
                    </label>
                </div>
            </div>
            <div
                className="grid min-h-0 flex-1 overflow-hidden max-[900px]:grid-cols-1"
                style={{
                    gridTemplateColumns: `${diffSidebarWidth}px 8px minmax(0, 1fr)`,
                }}
            >
                <aside className="min-w-0 overflow-auto bg-background/70 px-1.5 py-2 max-[900px]:max-h-[260px] max-[900px]:border-b max-[900px]:border-border">
                    <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
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
                    className="relative cursor-col-resize max-[900px]:hidden after:absolute after:top-0 after:bottom-0 after:left-[3px] after:w-px after:bg-border after:content-['']"
                    onMouseDown={() => setIsResizingDiffSidebar(true)}
                />

                <div className="min-w-0 overflow-auto bg-background">
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
                        <Surface className="m-3 rounded-md text-sm text-muted-foreground">
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
