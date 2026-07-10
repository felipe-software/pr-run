import type { PullRequestReviewComment } from "@/types/pr-run";

export type DiffCommentDraft = {
    endLine: number;
    endSide: "additions" | "deletions";
    path: string;
    startLine: number;
    startSide: "additions" | "deletions";
};

export type DiffReviewAnnotation =
    | { comment: PullRequestReviewComment; kind: "comment" }
    | { draft: DiffCommentDraft; kind: "draft" };
