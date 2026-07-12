import {
    FileDiff,
    type FileDiffMetadata,
    type SelectedLineRange,
} from "@pierre/diffs/react";
import { MessageSquarePlus } from "lucide-react";

import type {
    DiffCommentDraft,
    DiffReviewAnnotation,
} from "@/lib/components/templates/main-panel/changes/diff-review-types";
import { buildDiffAnnotations } from "@/lib/components/templates/main-panel/changes/continuous-diff";
import { ReviewAnnotation } from "@/lib/components/templates/main-panel/changes/review-annotation";
import { FileCommitStack } from "@/lib/components/templates/main-panel/changes/file-commit-stack";
import type { BranchDiffFile, PullRequestReviewComment } from "@/types/pr-run";

type FocusedDiffProps = {
    baseBranchName?: string;
    branchName: string;
    comments: PullRequestReviewComment[];
    draft?: DiffCommentDraft;
    fileDiff: FileDiffMetadata;
    file?: BranchDiffFile;
    isUnified: boolean;
    onChangeDraft: (draft?: DiffCommentDraft) => void;
    projectId: string;
    pullRequestNumber?: number;
    shouldWrap: boolean;
};

export function FocusedDiff({
    baseBranchName,
    branchName,
    comments,
    draft,
    fileDiff,
    file,
    isUnified,
    onChangeDraft,
    projectId,
    pullRequestNumber,
    shouldWrap,
}: FocusedDiffProps) {
    const selectedLines: SelectedLineRange | null =
        draft && draft.path === fileDiff.name
            ? {
                  end: draft.endLine,
                  endSide: draft.endSide,
                  side: draft.startSide,
                  start: draft.startLine,
              }
            : null;

    function selectRange(range: SelectedLineRange | null) {
        if (!range || !pullRequestNumber) {
            return;
        }

        onChangeDraft({
            endLine: range.end,
            endSide: range.endSide ?? range.side ?? "additions",
            path: fileDiff.name,
            startLine: range.start,
            startSide: range.side ?? "additions",
        });
    }

    return (
        <div
            className="h-full min-h-0 overflow-auto overscroll-contain"
            data-branch-page-primary-scroll=""
        >
            <FileDiff<DiffReviewAnnotation>
                className="min-w-full"
                disableWorkerPool
                fileDiff={fileDiff}
                lineAnnotations={buildDiffAnnotations(
                    fileDiff.name,
                    comments,
                    draft,
                )}
                options={{
                    diffIndicators: "bars",
                    diffStyle: isUnified ? "unified" : "split",
                    enableGutterUtility: Boolean(pullRequestNumber),
                    enableLineSelection: Boolean(pullRequestNumber),
                    hunkSeparators: "line-info-basic",
                    lineDiffType: "word",
                    lineHoverHighlight: "both",
                    onLineSelected: selectRange,
                    overflow: shouldWrap ? "wrap" : "scroll",
                    stickyHeader: true,
                    themeType: "system",
                }}
                renderHeaderMetadata={() =>
                    file ? <FileCommitStack commits={file.commits} /> : null
                }
                renderAnnotation={(annotation) =>
                    annotation.metadata && pullRequestNumber ? (
                        <ReviewAnnotation
                            annotation={annotation.metadata}
                            baseBranchName={baseBranchName}
                            branchName={branchName}
                            projectId={projectId}
                            pullRequestNumber={pullRequestNumber}
                            onCloseDraft={() => onChangeDraft(undefined)}
                        />
                    ) : null
                }
                renderGutterUtility={(getHoveredLine) => (
                    <button
                        aria-label="Add line comment"
                        className="bg-primary text-primary-foreground flex
                            size-5 items-center justify-center rounded
                            shadow-sm"
                        type="button"
                        onClick={() => {
                            const line = getHoveredLine();

                            if (!line) {
                                return;
                            }

                            onChangeDraft({
                                endLine: line.lineNumber,
                                endSide: line.side,
                                path: fileDiff.name,
                                startLine: line.lineNumber,
                                startSide: line.side,
                            });
                        }}
                    >
                        <MessageSquarePlus className="size-3" />
                    </button>
                )}
                selectedLines={selectedLines}
            />
        </div>
    );
}
