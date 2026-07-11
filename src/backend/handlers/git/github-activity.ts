import { ghText, parseJson } from "@/backend/handlers/git/github";
import type {
    GitHubRepositoryInfo,
    GitHubUserInfo,
    PendingPullRequestReview,
    ProjectConfig,
    PullRequestGeneralComment,
    PullRequestReviewActivity,
    PullRequestReviewComment,
    PullRequestReviewState,
} from "@/backend/types";

type PullRequestViewPayload = {
    headRefOid?: string;
    reviewDecision?: string;
};

type ApiUser = {
    avatar_url?: string;
    html_url?: string;
    login?: string;
};

type ApiReview = {
    body?: string | null;
    html_url?: string;
    id: number;
    node_id?: string;
    state?: string;
    submitted_at?: string | null;
    user?: ApiUser;
};

type ApiIssueComment = {
    body?: string;
    created_at?: string;
    html_url?: string;
    id: number;
    user?: ApiUser;
};

type ApiPullRequestCommit = {
    sha?: string;
};

type ApiReviewComment = {
    body?: string;
    created_at?: string;
    diff_hunk?: string;
    html_url?: string;
    id: number;
    line?: number | null;
    original_line?: number | null;
    original_start_line?: number | null;
    path?: string;
    pull_request_review_id?: number;
    side?: "LEFT" | "RIGHT" | null;
    start_line?: number | null;
    start_side?: "LEFT" | "RIGHT" | null;
    subject_type?: "file" | "line";
    user?: ApiUser;
};

export type GitHubReviewSnapshot = {
    comments: PullRequestGeneralComment[];
    headRefOid: string;
    pendingReview?: PendingPullRequestReview;
    pullRequestCommitHashes: string[];
    reviewComments: PullRequestReviewComment[];
    reviewDecision?: string;
    reviews: PullRequestReviewActivity[];
    viewer: GitHubUserInfo;
};

export async function getGitHubReviewSnapshot(
    project: ProjectConfig,
    repository: GitHubRepositoryInfo,
    pullRequestNumber: number,
): Promise<GitHubReviewSnapshot> {
    const repositoryName = repository.nameWithOwner;
    const [
        viewOutput,
        commentsOutput,
        reviewsOutput,
        reviewCommentsOutput,
        pullRequestCommitsOutput,
        viewerOutput,
    ] = await Promise.all([
        ghText(
            [
                "pr",
                "view",
                String(pullRequestNumber),
                "--repo",
                repositoryName,
                "--json",
                "headRefOid,reviewDecision",
            ],
            { cwd: project.path },
        ),
        ghText(
            [
                "api",
                `repos/${repositoryName}/issues/${pullRequestNumber}/comments`,
                "--paginate",
                "--slurp",
            ],
            { cwd: project.path },
        ),
        ghText(
            [
                "api",
                `repos/${repositoryName}/pulls/${pullRequestNumber}/reviews`,
                "--paginate",
                "--slurp",
            ],
            { cwd: project.path },
        ),
        ghText(
            [
                "api",
                `repos/${repositoryName}/pulls/${pullRequestNumber}/comments`,
                "--paginate",
                "--slurp",
            ],
            { cwd: project.path },
        ),
        ghText(
            [
                "api",
                `repos/${repositoryName}/pulls/${pullRequestNumber}/commits`,
                "--paginate",
                "--slurp",
            ],
            { cwd: project.path },
        ),
        ghText(["api", "user"], { cwd: project.path }),
    ]);
    const [
        view,
        apiComments,
        apiReviews,
        apiReviewComments,
        apiPullRequestCommits,
        apiViewer,
    ] = await Promise.all([
        parseJson<PullRequestViewPayload>(viewOutput),
        parseJson<ApiIssueComment[][]>(commentsOutput).then((pages) =>
            pages.flat(),
        ),
        parseJson<ApiReview[][]>(reviewsOutput).then((pages) => pages.flat()),
        parseJson<ApiReviewComment[][]>(reviewCommentsOutput).then((pages) =>
            pages.flat(),
        ),
        parseJson<ApiPullRequestCommit[][]>(pullRequestCommitsOutput),
        parseJson<ApiUser>(viewerOutput),
    ]);
    const viewer = normalizeApiUser(apiViewer);
    const reviewComments = apiReviewComments.map((comment) =>
        normalizeReviewComment(comment, viewer.login),
    );
    const publishedReviews = apiReviews.filter(
        (review) => normalizeReviewState(review.state) !== "PENDING",
    );
    const pendingApiReview = apiReviews.find(
        (review) =>
            normalizeReviewState(review.state) === "PENDING" &&
            review.user?.login === viewer.login,
    );

    return {
        comments: apiComments.flatMap((comment) => {
            const normalizedComment = normalizeGeneralComment(
                comment,
                viewer.login,
            );

            return normalizedComment ? [normalizedComment] : [];
        }),
        headRefOid: view.headRefOid ?? "",
        pendingReview: pendingApiReview
            ? {
                  body: pendingApiReview.body ?? "",
                  comments: reviewComments.filter(
                      (comment) =>
                          comment.pullRequestReviewId === pendingApiReview.id,
                  ),
                  id: pendingApiReview.id,
                  nodeId: pendingApiReview.node_id ?? "",
              }
            : undefined,
        pullRequestCommitHashes: normalizePullRequestCommitHashes(
            apiPullRequestCommits,
        ),
        reviewComments,
        reviewDecision: view.reviewDecision,
        reviews: publishedReviews.flatMap((review) => {
            if (!review.submitted_at) {
                return [];
            }

            return [
                {
                    author: normalizeApiUser(review.user),
                    body: review.body ?? "",
                    comments: reviewComments.filter(
                        (comment) => comment.pullRequestReviewId === review.id,
                    ),
                    id: String(review.id),
                    state: normalizeReviewState(review.state),
                    submittedAt: review.submitted_at,
                    url: review.html_url,
                },
            ];
        }),
        viewer,
    };
}

export function normalizePullRequestCommitHashes(
    pages: ApiPullRequestCommit[][],
) {
    return Array.from(
        new Set(
            pages
                .flat()
                .map((commit) => commit.sha?.trim())
                .filter((hash): hash is string => Boolean(hash)),
        ),
    );
}

export function normalizeGeneralComment(
    comment: ApiIssueComment,
    viewerLogin: string,
): PullRequestGeneralComment | undefined {
    if (!comment.created_at || !comment.html_url) {
        return undefined;
    }

    const author = normalizeApiUser(comment.user);

    return {
        author,
        body: comment.body ?? "",
        createdAt: comment.created_at,
        id: String(comment.id),
        url: comment.html_url,
        viewerDidAuthor: author.login === viewerLogin,
    };
}

export function normalizeReviewComment(
    comment: ApiReviewComment,
    viewerLogin: string,
): PullRequestReviewComment {
    return {
        author: normalizeApiUser(comment.user),
        body: comment.body ?? "",
        createdAt: comment.created_at ?? new Date(0).toISOString(),
        diffHunk: comment.diff_hunk ?? "",
        id: comment.id,
        isOutdated: comment.subject_type !== "file" && comment.line == null,
        line: comment.line ?? comment.original_line ?? undefined,
        path: comment.path ?? "Unknown file",
        pullRequestReviewId: comment.pull_request_review_id,
        side: comment.side ?? undefined,
        startLine:
            comment.start_line ?? comment.original_start_line ?? undefined,
        startSide: comment.start_side ?? undefined,
        subjectType: comment.subject_type === "file" ? "file" : "line",
        url: comment.html_url ?? "",
        viewerDidAuthor: comment.user?.login === viewerLogin,
    };
}

function normalizeApiUser(user: ApiUser | undefined): GitHubUserInfo {
    const login = user?.login ?? "unknown";

    return {
        avatarUrl:
            user?.avatar_url ??
            `https://github.com/identicons/${encodeURIComponent(login)}.png`,
        login,
        url: user?.html_url ?? `https://github.com/${login}`,
    };
}

function normalizeReviewState(
    state: string | undefined,
): PullRequestReviewState {
    if (
        state === "APPROVED" ||
        state === "CHANGES_REQUESTED" ||
        state === "COMMENTED" ||
        state === "DISMISSED" ||
        state === "PENDING"
    ) {
        return state;
    }

    return "COMMENTED";
}
