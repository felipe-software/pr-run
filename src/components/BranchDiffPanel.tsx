import { FileDiff, type FileDiffMetadata } from "@pierre/diffs/react";
import { parsePatchFiles } from "@pierre/diffs";
import { Spinner, Surface } from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isHandledSshPromptError, prRunApi } from "../lib/api";
import { useSshPassphraseStore } from "../store/ssh-passphrase";
import type {
    BranchDiffResult,
    BranchInfo,
    ProjectConfig,
} from "../types/pr-run";
import { BranchDiffTree } from "./BranchDiffTree";

type BranchDiffPanelProps = {
    branch: BranchInfo;
    project: ProjectConfig;
};

export function BranchDiffPanel({ branch, project }: BranchDiffPanelProps) {
    const [branchDiff, setBranchDiff] = useState<BranchDiffResult>();
    const [error, setError] = useState<string>();
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPath, setSelectedPath] = useState<string>();
    const [shouldWrapLines, setShouldWrapLines] = useState(false);
    const [isUnifiedView, setIsUnifiedView] = useState(false);

    const loadDiff = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(undefined);
            const diff = await prRunApi.getBranchDiff(project.id, branch.name);

            setBranchDiff(diff);
            setSelectedPath((current) =>
                current && diff.files.some((file) => file.path === current)
                    ? current
                    : diff.files[0]?.path,
            );
        } catch (loadError) {
            if (isHandledSshPromptError(loadError)) {
                useSshPassphraseStore
                    .getState()
                    .setRetryAction(() => loadDiff().then(() => undefined));
                return;
            }

            setError(errorMessage(loadError));
        } finally {
            setIsLoading(false);
        }
    }, [branch.name, project.id]);

    useEffect(() => {
        setBranchDiff(undefined);
        setSelectedPath(undefined);
        void loadDiff();
    }, [loadDiff]);

    const fileDiffs = useMemo(
        () => parseFileDiffs(branchDiff?.patch ?? "", branch.name),
        [branch.name, branchDiff?.patch],
    );
    const selectedFileDiff = useMemo(
        () => findSelectedFileDiff(fileDiffs, selectedPath),
        [fileDiffs, selectedPath],
    );

    if (isLoading) {
        return (
            <Surface className="flex items-center gap-2 rounded-md text-sm text-muted-foreground">
                <Spinner size="sm" />
                Loading diff...
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

    if (!branchDiff || branchDiff.files.length === 0) {
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
                        <span>{branchDiff.files.length}</span>
                    </div>
                    <BranchDiffTree
                        files={branchDiff.files}
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

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}
