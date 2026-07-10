import {
    FileDiff,
    type FileDiffMetadata,
    type SelectedLineRange,
} from "@pierre/diffs/react";
import { ChevronLeft, ChevronRight, MessageSquarePlus } from "lucide-react";

import type {
    DiffCommentDraft,
    DiffReviewAnnotation,
} from "@/lib/components/templates/main-panel/changes/diff-review-types";
import { buildDiffAnnotations } from "@/lib/components/templates/main-panel/changes/continuous-diff";
import { ReviewAnnotation } from "@/lib/components/templates/main-panel/changes/review-annotation";
import { Button } from "@/lib/components/ui/button";
import type { PullRequestReviewComment } from "@/types/pr-run";

type FocusedDiffProps = {
    baseBranchName?: string;
    branchName: string;
    comments: PullRequestReviewComment[];
    draft?: DiffCommentDraft;
    fileDiff: FileDiffMetadata;
    hasNext: boolean;
    hasPrevious: boolean;
    isUnified: boolean;
    onChangeDraft: (draft?: DiffCommentDraft) => void;
    onNext: () => void;
    onPrevious: () => void;
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
    hasNext,
    hasPrevious,
    isUnified,
    onChangeDraft,
    onNext,
    onPrevious,
    projectId,
    pullRequestNumber,
    shouldWrap,
}: FocusedDiffProps) {
    const selectedLines: SelectedLineRange | null = draft
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
        <div className="flex h-full min-h-0 flex-col">
            <div
                className="border-border/70 flex shrink-0 items-center
                    justify-between border-b px-2 py-1"
            >
                <span
                    className="text-muted-foreground min-w-0 truncate font-mono
                        text-[11px]"
                >
                    {fileDiff.name}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        aria-label="Previous file"
                        disabled={!hasPrevious}
                        size="icon-xs"
                        variant="ghost"
                        onClick={onPrevious}
                    >
                        <ChevronLeft className="size-3.5" />
                    </Button>
                    <Button
                        aria-label="Next file"
                        disabled={!hasNext}
                        size="icon-xs"
                        variant="ghost"
                        onClick={onNext}
                    >
                        <ChevronRight className="size-3.5" />
                    </Button>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
                <FileDiff<DiffReviewAnnotation>
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
                            className="bg-primary text-primary-foreground grid
                                size-5 place-items-center rounded shadow-sm"
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
        </div>
    );
}
