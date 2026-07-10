import { tryPromise } from "@/backend/handlers/error";
import { getGitHubReviewSnapshot } from "@/backend/handlers/git/github-activity";
import {
    ApiError,
    type GitHubRepositoryInfo,
    type ProjectConfig,
    type PullRequestReviewMutationResult,
    type ReviewCommentMode,
    type ReviewEvent,
} from "@/backend/types";

export type ReviewCommentInput = {
    body: string;
    line: number;
    mode: ReviewCommentMode;
    path: string;
    side: "LEFT" | "RIGHT";
    startLine?: number;
    startSide?: "LEFT" | "RIGHT";
};

type GitHubMutationPayload = {
    html_url?: string;
    id?: number | string;
    node_id?: string;
};

type AddReviewThreadPayload = {
    data?: {
        addPullRequestReviewThread?: {
            thread?: {
                comments?: {
                    nodes?: Array<{
                        databaseId?: number;
                        url?: string;
                    }>;
                };
            };
        };
    };
    errors?: Array<{ message?: string }>;
};

export async function addPullRequestComment(
    project: ProjectConfig,
    repository: GitHubRepositoryInfo,
    pullRequestNumber: number,
    body: string,
): Promise<PullRequestReviewMutationResult> {
    return await runGitHubMutation(async () => {
        const result = await ghApiJson<GitHubMutationPayload>(
            project,
            `repos/${repository.nameWithOwner}/issues/${pullRequestNumber}/comments`,
            "POST",
            { body },
        );

        return mutationResult(result);
    });
}

export async function addPullRequestReviewComment(
    project: ProjectConfig,
    repository: GitHubRepositoryInfo,
    pullRequestNumber: number,
    input: ReviewCommentInput,
): Promise<PullRequestReviewMutationResult> {
    return await runGitHubMutation(async () => {
        const snapshot = await getGitHubReviewSnapshot(
            project,
            repository,
            pullRequestNumber,
        );
        const payload = {
            body: input.body,
            line: input.line,
            path: input.path,
            side: input.side,
            ...(input.startLine
                ? {
                      start_line: input.startLine,
                      start_side: input.startSide ?? input.side,
                  }
                : {}),
        };

        if (input.mode === "immediate") {
            const result = await ghApiJson<GitHubMutationPayload>(
                project,
                `repos/${repository.nameWithOwner}/pulls/${pullRequestNumber}/comments`,
                "POST",
                { ...payload, commit_id: snapshot.headRefOid },
            );

            return mutationResult(result);
        }

        const pendingReview =
            snapshot.pendingReview ??
            (await (async () => {
                const created = await ghApiJson<GitHubMutationPayload>(
                    project,
                    `repos/${repository.nameWithOwner}/pulls/${pullRequestNumber}/reviews`,
                    "POST",
                    { commit_id: snapshot.headRefOid },
                );

                return created.id && created.node_id
                    ? {
                          body: "",
                          comments: [],
                          id: Number(created.id),
                          nodeId: created.node_id,
                      }
                    : undefined;
            })());

        if (!pendingReview?.nodeId) {
            throw new Error("GitHub did not return a pending review node id.");
        }

        const result = await ghGraphql<AddReviewThreadPayload>(
            project,
            `mutation AddReviewThread($input: AddPullRequestReviewThreadInput!) {
                addPullRequestReviewThread(input: $input) {
                    thread { comments(first: 1) { nodes { databaseId url } } }
                }
            }`,
            {
                input: {
                    body: input.body,
                    line: input.line,
                    path: input.path,
                    pullRequestReviewId: pendingReview.nodeId,
                    side: input.side,
                    ...(input.startLine
                        ? {
                              startLine: input.startLine,
                              startSide: input.startSide ?? input.side,
                          }
                        : {}),
                },
            },
        );
        const comment =
            result.data?.addPullRequestReviewThread?.thread?.comments
                ?.nodes?.[0];

        if (result.errors?.length || !comment) {
            throw new Error(
                result.errors?.map((error) => error.message).join("; ") ||
                    "GitHub did not return the created review comment.",
            );
        }

        return {
            id: comment.databaseId ?? crypto.randomUUID(),
            url: comment.url,
        };
    });
}

export async function submitPullRequestReview(
    project: ProjectConfig,
    repository: GitHubRepositoryInfo,
    pullRequestNumber: number,
    event: ReviewEvent,
    body?: string,
): Promise<PullRequestReviewMutationResult> {
    return await runGitHubMutation(async () => {
        const snapshot = await getGitHubReviewSnapshot(
            project,
            repository,
            pullRequestNumber,
        );
        const trimmedBody = validateReviewSubmission(
            event,
            body,
            snapshot.pendingReview?.comments.length ?? 0,
        );

        const endpoint = snapshot.pendingReview
            ? `repos/${repository.nameWithOwner}/pulls/${pullRequestNumber}/reviews/${snapshot.pendingReview.id}/events`
            : `repos/${repository.nameWithOwner}/pulls/${pullRequestNumber}/reviews`;
        const result = await ghApiJson<GitHubMutationPayload>(
            project,
            endpoint,
            "POST",
            {
                body: trimmedBody || undefined,
                commit_id: snapshot.pendingReview
                    ? undefined
                    : snapshot.headRefOid,
                event,
            },
        );

        return mutationResult(result);
    });
}

export function validateReviewSubmission(
    event: ReviewEvent,
    body: string | undefined,
    pendingCommentCount: number,
) {
    const trimmedBody = body?.trim() ?? "";

    if (event === "REQUEST_CHANGES" && !trimmedBody) {
        throw new ApiError(
            "BAD_REQUEST",
            "Explain the requested changes before submitting the review.",
            400,
        );
    }

    if (event === "COMMENT" && !trimmedBody && pendingCommentCount === 0) {
        throw new ApiError(
            "BAD_REQUEST",
            "Add a review summary or an inline comment before submitting.",
            400,
        );
    }

    return trimmedBody;
}

export async function discardPendingPullRequestReview(
    project: ProjectConfig,
    repository: GitHubRepositoryInfo,
    pullRequestNumber: number,
): Promise<PullRequestReviewMutationResult> {
    return await runGitHubMutation(async () => {
        const snapshot = await getGitHubReviewSnapshot(
            project,
            repository,
            pullRequestNumber,
        );

        if (!snapshot.pendingReview) {
            throw new ApiError(
                "REVIEW_NOT_FOUND",
                "There is no pending review to discard.",
                404,
            );
        }

        await ghApiJson(
            project,
            `repos/${repository.nameWithOwner}/pulls/${pullRequestNumber}/reviews/${snapshot.pendingReview.id}`,
            "DELETE",
        );

        return { id: snapshot.pendingReview.id };
    });
}

async function runGitHubMutation<T>(mutation: () => Promise<T>) {
    const [error, result] = await tryPromise(mutation());

    if (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            "GITHUB_INTEGRATION_FAILED",
            "GitHub could not complete this review action.",
            502,
            error.message,
        );
    }

    return result;
}

async function ghApiJson<T>(
    project: ProjectConfig,
    endpoint: string,
    method: "DELETE" | "POST",
    payload?: Record<string, unknown>,
) {
    const childProcess = Bun.spawn(
        ["gh", "api", endpoint, "--method", method, "--input", "-"],
        {
            cwd: project.path,
            env: { ...process.env, GH_PROMPT_DISABLED: "1" },
            stderr: "pipe",
            stdin: "pipe",
            stdout: "pipe",
        },
    );

    childProcess.stdin.write(JSON.stringify(removeUndefined(payload ?? {})));
    childProcess.stdin.end();

    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(childProcess.stdout).text(),
        new Response(childProcess.stderr).text(),
        childProcess.exited,
    ]);

    if (exitCode !== 0) {
        throw new Error(stderr.trim() || `gh exited with code ${exitCode}.`);
    }

    return stdout.trim() ? (JSON.parse(stdout) as T) : ({} as T);
}

async function ghGraphql<T>(
    project: ProjectConfig,
    query: string,
    variables: Record<string, unknown>,
) {
    const childProcess = Bun.spawn(["gh", "api", "graphql", "--input", "-"], {
        cwd: project.path,
        env: { ...process.env, GH_PROMPT_DISABLED: "1" },
        stderr: "pipe",
        stdin: "pipe",
        stdout: "pipe",
    });

    childProcess.stdin.write(JSON.stringify({ query, variables }));
    childProcess.stdin.end();

    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(childProcess.stdout).text(),
        new Response(childProcess.stderr).text(),
        childProcess.exited,
    ]);

    if (exitCode !== 0) {
        throw new Error(stderr.trim() || `gh exited with code ${exitCode}.`);
    }

    return JSON.parse(stdout) as T;
}

function removeUndefined(value: Record<string, unknown>) {
    return Object.fromEntries(
        Object.entries(value).filter((entry) => entry[1] !== undefined),
    );
}

function mutationResult(
    payload: GitHubMutationPayload,
): PullRequestReviewMutationResult {
    return {
        id: payload.id ?? crypto.randomUUID(),
        url: payload.html_url,
    };
}
