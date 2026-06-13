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
    branchName: string;
    projectId: string;
};

export function BranchDiffPanel({
    branchName,
    projectId,
}: BranchDiffPanelProps) {
    const [selectedPath, setSelectedPath] = useState<string>();
    const [shouldWrapLines, setShouldWrapLines] = useState(false);
    const [isUnifiedView, setIsUnifiedView] = useState(false);
    const branchDiffQuery = useBranchDiffQuery(projectId, branchName);
    const isAwaitingSshPassphrase = isHandledSshPromptError(
        branchDiffQuery.error,
    );

    useEffect(() => {
        setSelectedPath(undefined);
    }, [branchName, projectId]);

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
        <section className="branch-diff-page">
            <div className="branch-diff-toolbar">
                <div className="branch-diff-toolbar-title">
                    <span>{selectedPath ?? "Diff"}</span>
                </div>
                <div className="branch-diff-options">
                    <label className="branch-diff-option">
                        <input
                            checked={shouldWrapLines}
                            type="checkbox"
                            onChange={(event) =>
                                setShouldWrapLines(event.target.checked)
                            }
                        />
                        <span>Wrap lines</span>
                    </label>
                    <label className="branch-diff-option">
                        <input
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
            <div className="branch-diff-body">
                <aside className="branch-diff-file-column">
                    <div className="branch-diff-column-header">
                        <span>Changed files</span>
                        <span>{branchDiffQuery.data.files.length}</span>
                    </div>
                    <BranchDiffTree
                        files={branchDiffQuery.data.files}
                        selectedPath={selectedPath}
                        onSelectFile={setSelectedPath}
                    />
                </aside>

                <div className="branch-diff-editor">
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
                        <Surface className="rounded-md text-sm text-muted-foreground">
                            Select a changed file.
                        </Surface>
                    )}
                </div>
            </div>
        </section>
    );
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
