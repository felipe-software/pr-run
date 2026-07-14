import { Elysia } from "elysia";

import { gitHandler } from "@/backend/handlers/git";
import { projectConfigHandler } from "@/backend/handlers/project-config";
import { success } from "@/backend/http/response";
import { ApiError } from "@/backend/types";

const router = new Elysia();

router
    .post(
        "/projects/:projectId/pull-requests/:pullRequestNumber/comments",
        async ({ params, body }) => {
            const payload = body as { body?: string };
            const pullRequestNumber = parsePullRequestNumber(
                params.pullRequestNumber,
            );

            if (!payload.body?.trim()) {
                throw new ApiError("BAD_REQUEST", "Enter a comment.", 400);
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success("Comment added.", [
                await gitHandler.addGeneralComment(
                    project,
                    pullRequestNumber,
                    payload.body.trim(),
                ),
            ]);
        },
    )
    .post(
        "/projects/:projectId/pull-requests/:pullRequestNumber/review-comments",
        async ({ params, body }) => {
            const payload = body as {
                body?: string;
                line?: number;
                mode?: string;
                path?: string;
                side?: string;
                startLine?: number;
                startSide?: string;
            };
            const pullRequestNumber = parsePullRequestNumber(
                params.pullRequestNumber,
            );

            if (
                !payload.body?.trim() ||
                !payload.path?.trim() ||
                !Number.isSafeInteger(payload.line) ||
                Number(payload.line) < 1 ||
                (payload.mode !== "immediate" && payload.mode !== "pending") ||
                (payload.side !== "LEFT" && payload.side !== "RIGHT") ||
                (payload.startSide !== undefined &&
                    payload.startSide !== "LEFT" &&
                    payload.startSide !== "RIGHT")
            ) {
                throw new ApiError(
                    "BAD_REQUEST",
                    "Enter a valid review comment and line range.",
                    400,
                );
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success("Review comment added.", [
                await gitHandler.addReviewComment(project, pullRequestNumber, {
                    body: payload.body.trim(),
                    line: Number(payload.line),
                    mode: payload.mode,
                    path: payload.path.trim(),
                    side: payload.side,
                    startLine: payload.startLine,
                    startSide: payload.startSide,
                }),
            ]);
        },
    )
    .post(
        "/projects/:projectId/pull-requests/:pullRequestNumber/reviews/submit",
        async ({ params, body }) => {
            const payload = body as { body?: string; event?: string };
            const pullRequestNumber = parsePullRequestNumber(
                params.pullRequestNumber,
            );

            if (
                payload.event !== "APPROVE" &&
                payload.event !== "COMMENT" &&
                payload.event !== "REQUEST_CHANGES"
            ) {
                throw new ApiError(
                    "BAD_REQUEST",
                    "Enter a valid review outcome.",
                    400,
                );
            }

            if (payload.event === "REQUEST_CHANGES" && !payload.body?.trim()) {
                throw new ApiError(
                    "BAD_REQUEST",
                    "Explain the requested changes.",
                    400,
                );
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success("Review submitted.", [
                await gitHandler.submitReview(
                    project,
                    pullRequestNumber,
                    payload.event,
                    payload.body,
                ),
            ]);
        },
    )
    .delete(
        "/projects/:projectId/pull-requests/:pullRequestNumber/reviews/pending",
        async ({ params }) => {
            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success("Pending review discarded.", [
                await gitHandler.discardPendingReview(
                    project,
                    parsePullRequestNumber(params.pullRequestNumber),
                ),
            ]);
        },
    );

function parsePullRequestNumber(value: string) {
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 1) {
        throw new ApiError(
            "BAD_REQUEST",
            "Enter a valid pull request number.",
            400,
        );
    }

    return number;
}

export default router;
