import { MessageSquareText, Send, X } from "lucide-react";
import { useState } from "react";

import { MarkdownComposer } from "@/lib/components/molecules/markdown/markdown-composer";
import { MarkdownRenderer } from "@/lib/components/molecules/markdown/markdown-renderer";
import { ActivityAvatar } from "@/lib/components/templates/main-panel/activity/activity-avatar";
import type {
    DiffCommentDraft,
    DiffReviewAnnotation,
} from "@/lib/components/templates/main-panel/changes/diff-review-types";
import { Button } from "@/lib/components/ui/button";
import { toast } from "@/lib/components/ui/toast";
import { tryPromise } from "@/lib/error";
import { usePullRequestReviewMutations } from "@/lib/hooks/query/use-pull-request-review-mutations";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ReviewCommentMode } from "@/types/pr-run";

type ReviewAnnotationProps = {
    annotation: DiffReviewAnnotation;
    baseBranchName?: string;
    branchName: string;
    onCloseDraft: () => void;
    projectId: string;
    pullRequestNumber: number;
};

export function ReviewAnnotation({
    annotation,
    baseBranchName,
    branchName,
    onCloseDraft,
    projectId,
    pullRequestNumber,
}: ReviewAnnotationProps) {
    if (annotation.kind === "comment") {
        const { comment } = annotation;

        return (
            <div
                className="border-primary/20 bg-background mx-2 my-1.5 flex
                    max-w-2xl gap-2 rounded-lg border p-2 shadow-sm/5"
            >
                <ActivityAvatar
                    className="size-6"
                    imageUrl={comment.author.avatarUrl}
                    name={comment.author.login}
                />
                <div className="min-w-0 text-xs">
                    <div className="font-semibold">{comment.author.login}</div>
                    <MarkdownRenderer
                        className="mt-0.5 text-xs leading-5"
                        markdown={comment.body}
                    />
                </div>
            </div>
        );
    }

    return (
        <InlineReviewComposer
            baseBranchName={baseBranchName}
            branchName={branchName}
            draft={annotation.draft}
            projectId={projectId}
            pullRequestNumber={pullRequestNumber}
            onClose={onCloseDraft}
        />
    );
}

function InlineReviewComposer({
    baseBranchName,
    branchName,
    draft,
    projectId,
    pullRequestNumber,
    onClose,
}: {
    baseBranchName?: string;
    branchName: string;
    draft: DiffCommentDraft;
    projectId: string;
    pullRequestNumber: number;
    onClose: () => void;
}) {
    const [body, setBody] = useState("");
    const { reviewCommentMutation } = usePullRequestReviewMutations({
        baseBranchName,
        branchName,
        projectId,
        pullRequestNumber,
    });

    async function submit(mode: ReviewCommentMode) {
        if (!body.trim()) {
            return;
        }

        const isRange =
            draft.startLine !== draft.endLine ||
            draft.startSide !== draft.endSide;
        const [error] = await tryPromise(
            reviewCommentMutation.mutateAsync({
                body: body.trim(),
                line: draft.endLine,
                mode,
                path: draft.path,
                side: toGitHubSide(draft.endSide),
                startLine: isRange ? draft.startLine : undefined,
                startSide: isRange ? toGitHubSide(draft.startSide) : undefined,
            }),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        toast.success(
            mode === "pending" ? "Added to pending review." : "Comment added.",
            { timeout: 2200 },
        );
        onClose();
    }

    return (
        <div
            className="border-primary/30 bg-background mx-2 my-1.5 grid
                max-w-2xl gap-2 rounded-lg border p-2.5 shadow-md/10"
        >
            <div className="flex items-center justify-between gap-2">
                <span
                    className="text-muted-foreground inline-flex items-center
                        gap-1.5 text-xs"
                >
                    <MessageSquareText className="size-3.5" />
                    {draft.startLine === draft.endLine
                        ? `Comment on line ${draft.endLine}`
                        : `Comment on lines ${draft.startLine}-${draft.endLine}`}
                </span>
                <Button
                    aria-label="Cancel inline comment"
                    size="icon-xs"
                    variant="ghost"
                    onClick={onClose}
                >
                    <X className="size-3.5" />
                </Button>
            </div>
            <MarkdownComposer
                ariaLabel="Inline review comment"
                autoFocus
                disabled={reviewCommentMutation.isPending}
                footer={
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button
                            disabled={
                                !body.trim() || reviewCommentMutation.isPending
                            }
                            size="xs"
                            variant="outline"
                            onClick={() => submit("immediate")}
                        >
                            <Send className="size-3" />
                            Add now
                        </Button>
                        <Button
                            disabled={
                                !body.trim() || reviewCommentMutation.isPending
                            }
                            size="xs"
                            onClick={() => submit("pending")}
                        >
                            Add to review
                        </Button>
                    </div>
                }
                placeholder="Leave a review comment…"
                textareaClassName="min-h-16"
                value={body}
                onChange={setBody}
            />
        </div>
    );
}

function toGitHubSide(side: "additions" | "deletions") {
    return side === "additions" ? ("RIGHT" as const) : ("LEFT" as const);
}
