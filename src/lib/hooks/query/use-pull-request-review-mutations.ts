import { useMutation, useQueryClient } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";
import type { ReviewCommentMode, ReviewEvent } from "@/types/pr-run";

type ReviewContext = {
    baseBranchName?: string;
    branchName: string;
    projectId: string;
    pullRequestNumber: number;
};

export function usePullRequestReviewMutations(context: ReviewContext) {
    const queryClient = useQueryClient();
    const activityKey = prRunQueryKeys.activity(
        context.projectId,
        context.branchName,
        context.baseBranchName ?? "default",
        context.pullRequestNumber,
    );
    const refreshActivity = () =>
        queryClient.invalidateQueries({ queryKey: activityKey });
    const commentMutation = useMutation({
        mutationFn: (body: string) =>
            prRunApi.addPullRequestComment(
                context.projectId,
                context.pullRequestNumber,
                body,
            ),
        onSuccess: refreshActivity,
    });
    const reviewCommentMutation = useMutation({
        mutationFn: (input: {
            body: string;
            line: number;
            mode: ReviewCommentMode;
            path: string;
            side: "LEFT" | "RIGHT";
            startLine?: number;
            startSide?: "LEFT" | "RIGHT";
        }) =>
            prRunApi.addPullRequestReviewComment(
                context.projectId,
                context.pullRequestNumber,
                input,
            ),
        onSuccess: refreshActivity,
    });
    const submitReviewMutation = useMutation({
        mutationFn: (input: { body?: string; event: ReviewEvent }) =>
            prRunApi.submitPullRequestReview(
                context.projectId,
                context.pullRequestNumber,
                input.event,
                input.body,
            ),
        onSuccess: refreshActivity,
    });
    const discardReviewMutation = useMutation({
        mutationFn: () =>
            prRunApi.discardPendingPullRequestReview(
                context.projectId,
                context.pullRequestNumber,
            ),
        onSuccess: refreshActivity,
    });

    return {
        commentMutation,
        discardReviewMutation,
        reviewCommentMutation,
        submitReviewMutation,
    };
}
