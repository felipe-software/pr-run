import type {
    PullRequestReviewMutationResult,
    ReviewCommentMode,
    ReviewEvent,
} from "@/types/pr-run";
import { projectPath } from "./projects";
import { requestOne } from "./transport";

export const reviewApi = {
    addPullRequestComment(
        projectId: string,
        pullRequestNumber: number,
        body: string,
    ) {
        return mutateReview(projectId, pullRequestNumber, "/comments", {
            json: { body },
            method: "POST",
        });
    },
    addPullRequestReviewComment(
        projectId: string,
        pullRequestNumber: number,
        input: {
            body: string;
            line: number;
            mode: ReviewCommentMode;
            path: string;
            side: "LEFT" | "RIGHT";
            startLine?: number;
            startSide?: "LEFT" | "RIGHT";
        },
    ) {
        return mutateReview(projectId, pullRequestNumber, "/review-comments", {
            json: input,
            method: "POST",
        });
    },
    discardPendingPullRequestReview(
        projectId: string,
        pullRequestNumber: number,
    ) {
        return mutateReview(projectId, pullRequestNumber, "/reviews/pending", {
            method: "DELETE",
        });
    },
    submitPullRequestReview(
        projectId: string,
        pullRequestNumber: number,
        event: ReviewEvent,
        body?: string,
    ) {
        return mutateReview(projectId, pullRequestNumber, "/reviews/submit", {
            json: { body, event },
            method: "POST",
        });
    },
};

function mutateReview(
    projectId: string,
    pullRequestNumber: number,
    suffix: string,
    options: Parameters<typeof requestOne>[1],
) {
    return requestOne<PullRequestReviewMutationResult>(
        projectPath(projectId, `/pull-requests/${pullRequestNumber}${suffix}`),
        options,
    );
}
