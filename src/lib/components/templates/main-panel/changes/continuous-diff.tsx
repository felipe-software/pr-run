import {
    CodeView,
    type CodeViewHandle,
    type CodeViewItem,
    type DiffLineAnnotation,
    type FileDiffMetadata,
} from "@pierre/diffs/react";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import type {
    DiffCommentDraft,
    DiffReviewAnnotation,
} from "@/lib/components/templates/main-panel/changes/diff-review-types";
import { ReviewAnnotation } from "@/lib/components/templates/main-panel/changes/review-annotation";
import type { BranchDiffFile, PullRequestReviewComment } from "@/types/pr-run";

type ContinuousDiffProps = {
    baseBranchName?: string;
    branchName: string;
    comments: PullRequestReviewComment[];
    draft?: DiffCommentDraft;
    files: BranchDiffFile[];
    fileDiffs: FileDiffMetadata[];
    isUnified: boolean;
    onChangeDraft: (draft?: DiffCommentDraft) => void;
    projectId: string;
    pullRequestNumber?: number;
    shouldWrap: boolean;
    targetPath?: string;
};

export function ContinuousDiff({
    baseBranchName,
    branchName,
    comments,
    draft,
    files,
    fileDiffs,
    isUnified,
    onChangeDraft,
    projectId,
    pullRequestNumber,
    shouldWrap,
    targetPath,
}: ContinuousDiffProps) {
    const codeViewRef = useRef<CodeViewHandle<DiffReviewAnnotation>>(null);
    const fileByPath = useMemo(
        () => new Map(files.map((file) => [file.path, file])),
        [files],
    );
    const items = useMemo<CodeViewItem<DiffReviewAnnotation>[]>(
        () =>
            fileDiffs.map((fileDiff) => ({
                annotations: buildDiffAnnotations(
                    fileDiff.name,
                    comments,
                    draft,
                ),
                fileDiff,
                id: fileDiff.name,
                type: "diff",
                version:
                    comments.length + (draft?.path === fileDiff.name ? 1 : 0),
            })),
        [comments, draft, fileDiffs],
    );

    useEffect(() => {
        if (!targetPath) {
            return;
        }

        codeViewRef.current?.scrollTo({
            align: "start",
            behavior: "smooth",
            id: targetPath,
            offset: 8,
            type: "item",
        });
    }, [targetPath]);

    return (
        <CodeView<DiffReviewAnnotation>
            ref={codeViewRef}
            className="h-full min-h-0"
            disableWorkerPool
            items={items}
            options={{
                diffIndicators: "bars",
                diffStyle: isUnified ? "unified" : "split",
                enableGutterUtility: Boolean(pullRequestNumber),
                enableLineSelection: Boolean(pullRequestNumber),
                hunkSeparators: "line-info-basic",
                layout: { gap: 10, paddingBottom: 12, paddingTop: 8 },
                lineDiffType: "word",
                lineHoverHighlight: "both",
                overflow: shouldWrap ? "wrap" : "scroll",
                stickyHeaders: true,
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
            renderGutterUtility={(getHoveredLine, item) => (
                <button
                    aria-label="Add line comment"
                    className="bg-primary text-primary-foreground grid size-5
                        place-items-center rounded shadow-sm"
                    type="button"
                    onClick={() => {
                        const line = getHoveredLine() as
                            | {
                                  lineNumber: number;
                                  side?: "additions" | "deletions";
                              }
                            | undefined;

                        if (!line || item.type !== "diff") {
                            return;
                        }

                        onChangeDraft({
                            endLine: line.lineNumber,
                            endSide: line.side ?? "additions",
                            path: item.id,
                            startLine: line.lineNumber,
                            startSide: line.side ?? "additions",
                        });
                    }}
                >
                    <MessageSquarePlus className="size-3" />
                </button>
            )}
            renderHeaderMetadata={(item) => {
                if (item.type !== "diff") {
                    return null;
                }

                const file = fileByPath.get(item.id);
                return file ? (
                    <span className="font-mono text-[10px] tabular-nums">
                        <span className="text-success">+{file.additions}</span>{" "}
                        <span className="text-danger">−{file.deletions}</span>
                    </span>
                ) : null;
            }}
            onSelectedLinesChange={(selection) => {
                if (!selection || !pullRequestNumber) {
                    return;
                }

                onChangeDraft({
                    endLine: selection.range.end,
                    endSide:
                        selection.range.endSide ??
                        selection.range.side ??
                        "additions",
                    path: selection.id,
                    startLine: selection.range.start,
                    startSide: selection.range.side ?? "additions",
                });
            }}
        />
    );
}

export function buildDiffAnnotations(
    path: string,
    comments: PullRequestReviewComment[],
    draft?: DiffCommentDraft,
): DiffLineAnnotation<DiffReviewAnnotation>[] {
    const annotations: DiffLineAnnotation<DiffReviewAnnotation>[] = comments
        .filter(
            (comment) =>
                comment.path === path &&
                !comment.isOutdated &&
                comment.line !== undefined,
        )
        .map((comment) => ({
            lineNumber: comment.line!,
            metadata: { comment, kind: "comment" },
            side: comment.side === "LEFT" ? "deletions" : "additions",
        }));

    if (draft?.path === path) {
        annotations.push({
            lineNumber: draft.endLine,
            metadata: { draft, kind: "draft" },
            side: draft.endSide,
        });
    }

    return annotations;
}
