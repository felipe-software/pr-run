import { Check, MessageSquareText, Send, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/lib/components/ui/button";
import { Textarea } from "@/lib/components/ui/textarea";
import { toast } from "@/lib/components/ui/toast";
import { tryPromise } from "@/lib/error";
import { usePullRequestReviewMutations } from "@/lib/hooks/query/use-pull-request-review-mutations";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { PendingPullRequestReview, ReviewEvent } from "@/types/pr-run";

type ReviewComposerProps = {
    baseBranchName?: string;
    branchName: string;
    pendingReview?: PendingPullRequestReview;
    projectId: string;
    pullRequestNumber: number;
};

export function ReviewComposer({
    baseBranchName,
    branchName,
    pendingReview,
    projectId,
    pullRequestNumber,
}: ReviewComposerProps) {
    const [commentBody, setCommentBody] = useState("");
    const [reviewBody, setReviewBody] = useState(pendingReview?.body ?? "");
    const { commentMutation, discardReviewMutation, submitReviewMutation } =
        usePullRequestReviewMutations({
            baseBranchName,
            branchName,
            projectId,
            pullRequestNumber,
        });

    async function addComment() {
        const body = commentBody.trim();

        if (!body) {
            return;
        }

        const [error] = await tryPromise(commentMutation.mutateAsync(body));

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        setCommentBody("");
        toast.success("Comment added.", { timeout: 2200 });
    }

    async function submitReview(event: ReviewEvent) {
        const body = reviewBody.trim();

        if (event === "REQUEST_CHANGES" && !body) {
            toast.error("Explain the requested changes.", { timeout: 2600 });
            return;
        }

        const [error] = await tryPromise(
            submitReviewMutation.mutateAsync({
                body: body || undefined,
                event,
            }),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        setReviewBody("");
        toast.success(reviewSuccessMessage(event), { timeout: 2200 });
    }

    async function discardReview() {
        const [error] = await tryPromise(discardReviewMutation.mutateAsync());

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        setReviewBody("");
        toast.success("Pending review discarded.", { timeout: 2200 });
    }

    return (
        <section className="border-border/70 grid gap-3 border-t px-3 py-3">
            <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">
                        Join the discussion
                    </h3>
                    <span className="text-muted-foreground text-xs">
                        Markdown supported
                    </span>
                </div>
                <Textarea
                    aria-label="Pull request comment"
                    placeholder="Add a comment to this pull request…"
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                />
                <div className="flex justify-end">
                    <Button
                        disabled={
                            !commentBody.trim() || commentMutation.isPending
                        }
                        size="sm"
                        onClick={addComment}
                    >
                        <Send className="size-3.5" />
                        {commentMutation.isPending ? "Adding…" : "Add comment"}
                    </Button>
                </div>
            </div>

            <div className="border-border/70 grid gap-2 border-t pt-3">
                <div
                    className="flex flex-wrap items-center justify-between
                        gap-2"
                >
                    <div>
                        <h3 className="text-sm font-semibold">Submit review</h3>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                            {pendingReview?.comments.length
                                ? `${pendingReview.comments.length} inline ${pendingReview.comments.length === 1 ? "comment" : "comments"} queued`
                                : "Add an optional summary, then choose an outcome."}
                        </p>
                    </div>
                    {pendingReview ? (
                        <Button
                            disabled={discardReviewMutation.isPending}
                            size="xs"
                            variant="ghost"
                            onClick={discardReview}
                        >
                            <Trash2 className="size-3.5" />
                            Discard draft
                        </Button>
                    ) : null}
                </div>
                <Textarea
                    aria-label="Review summary"
                    className="min-h-16"
                    placeholder="Review summary (optional for comment or approval)…"
                    value={reviewBody}
                    onChange={(event) => setReviewBody(event.target.value)}
                />
                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        disabled={submitReviewMutation.isPending}
                        size="sm"
                        variant="outline"
                        onClick={() => submitReview("COMMENT")}
                    >
                        <MessageSquareText className="size-3.5" />
                        Comment
                    </Button>
                    <Button
                        disabled={submitReviewMutation.isPending}
                        size="sm"
                        variant="destructive-outline"
                        onClick={() => submitReview("REQUEST_CHANGES")}
                    >
                        <X className="size-3.5" />
                        Request changes
                    </Button>
                    <Button
                        disabled={submitReviewMutation.isPending}
                        size="sm"
                        onClick={() => submitReview("APPROVE")}
                    >
                        <Check className="size-3.5" />
                        Approve
                    </Button>
                </div>
            </div>
        </section>
    );
}

function reviewSuccessMessage(event: ReviewEvent) {
    if (event === "APPROVE") {
        return "Pull request approved.";
    }

    if (event === "REQUEST_CHANGES") {
        return "Changes requested.";
    }

    return "Review submitted.";
}
