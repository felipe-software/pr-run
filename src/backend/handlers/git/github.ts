import { tryPromise } from "@/backend/handlers/error";
import { logger } from "@/backend/logger";
import type {
    GitHubRepositoryInfo,
    GitHubUserInfo,
    ProjectConfig,
    PullRequestLatestReview,
    PullRequestReviewState,
    PullRequestState,
} from "@/backend/types";

type GitHubRepositoryPayload = GitHubRepositoryInfo & {
    defaultBranchRef?: {
        name?: string;
    } | null;
};

type GitHubAuthorPayload = {
    avatarUrl?: string | null;
    login?: string | null;
    url?: string | null;
};

type GitHubPullRequestPayload = {
    additions?: number | null;
    assignees?: (GitHubAuthorPayload | null)[] | null;
    author?: GitHubAuthorPayload | null;
    baseRefName?: string | null;
    changedFiles?: number | null;
    deletions?: number | null;
    headRefName?: string | null;
    isDraft?: boolean | null;
    latestReviews?: (GitHubLatestReviewPayload | null)[] | null;
    number?: number | null;
    reviewRequests?: (GitHubAuthorPayload | null)[] | null;
    state?: string | null;
    title?: string | null;
    updatedAt?: string | null;
    url?: string | null;
};

type GitHubLatestReviewPayload = {
    author?: GitHubAuthorPayload | null;
    state?: string | null;
};

type GitHubCommitPayload = {
    author?: GitHubAuthorPayload | null;
    url?: string | null;
};

export type GitHubPullRequest = {
    additions: number;
    assignees: GitHubUserInfo[];
    author?: GitHubUserInfo;
    baseBranchName: string;
    branchName: string;
    changedFiles: number;
    deletions: number;
    isDraft: boolean;
    latestReviews: PullRequestLatestReview[];
    number: number;
    reviewRequests: GitHubUserInfo[];
    state: PullRequestState;
    title: string;
    updatedAt: string | null;
    url: string;
};

type GhCommandOptions = {
    cwd?: string;
};

export class GhCommandError extends Error {
    httpStatus?: number;

    constructor(message: string) {
        super(message);
        this.name = "GhCommandError";
        const status = message.match(/\(HTTP (\d{3})\)/)?.[1];
        this.httpStatus = status ? Number(status) : undefined;
    }
}

type GitHubPullRequestListState = "closed" | "open";

const PULL_REQUEST_JSON_FIELDS = [
    "additions",
    "number",
    "title",
    "headRefName",
    "baseRefName",
    "changedFiles",
    "deletions",
    "author",
    "isDraft",
    "url",
    "updatedAt",
    "state",
    "assignees",
    "reviewRequests",
    "latestReviews",
].join(",");

function ghEnvironment() {
    return {
        ...process.env,
        GH_PROMPT_DISABLED: "1",
    };
}

export async function ghText(args: string[], options: GhCommandOptions = {}) {
    logger.debug({ args, cwd: options.cwd }, "gh text");

    const process = Bun.spawn(["gh", ...args], {
        cwd: options.cwd,
        env: ghEnvironment(),
        stderr: "pipe",
        stdout: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(process.stdout).text(),
        new Response(process.stderr).text(),
        process.exited,
    ]);

    if (exitCode !== 0) {
        throw new GhCommandError(
            stderr.trim() || `gh exited with code ${exitCode}.`,
        );
    }

    return stdout;
}

type GitHubPullRequestIdentity = {
    headRefName: string;
    nodeId: string;
    number: number;
};

export async function getGitHubPullRequestIdentity(
    project: ProjectConfig,
    repository: GitHubRepositoryInfo,
    pullRequestNumber: number,
): Promise<GitHubPullRequestIdentity> {
    const output = await ghText(
        [
            "api",
            `repos/${repository.nameWithOwner}/pulls/${pullRequestNumber}`,
            "--jq",
            "{number:.number,nodeId:.node_id,headRefName:.head.ref}",
        ],
        { cwd: project.path },
    );
    return await parseJson<GitHubPullRequestIdentity>(output);
}

export async function parseJson<T>(value: string): Promise<T> {
    return JSON.parse(value) as T;
}

export function normalizeAuthor(
    author: GitHubAuthorPayload | null | undefined,
): GitHubUserInfo | undefined {
    if (!author?.login) {
        return undefined;
    }

    return {
        avatarUrl:
            author.avatarUrl ??
            `https://github.com/${encodeURIComponent(author.login)}.png?size=64`,
        login: author.login,
        url: author.url ?? `https://github.com/${author.login}`,
    };
}

function normalizeAuthors(
    authors: (GitHubAuthorPayload | null)[] | null | undefined,
) {
    return (authors ?? []).flatMap((author) => {
        const normalizedAuthor = normalizeAuthor(author);
        return normalizedAuthor ? [normalizedAuthor] : [];
    });
}

function normalizeLatestReviewState(
    state: string | null | undefined,
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

function normalizeLatestReviews(
    reviews: (GitHubLatestReviewPayload | null)[] | null | undefined,
) {
    return (reviews ?? []).flatMap((review) => {
        const author = normalizeAuthor(review?.author);

        if (!author) {
            return [];
        }

        return [
            {
                author,
                state: normalizeLatestReviewState(review?.state),
            },
        ];
    });
}

function normalizePullRequestState(
    state: string | null | undefined,
): PullRequestState | undefined {
    if (state === "OPEN" || state === "CLOSED" || state === "MERGED") {
        return state;
    }

    return undefined;
}

export function normalizeGitHubPullRequests(
    pullRequests: GitHubPullRequestPayload[],
) {
    return pullRequests
        .map((pullRequest): GitHubPullRequest | null => {
            const state = normalizePullRequestState(pullRequest.state);

            if (
                !pullRequest.number ||
                !pullRequest.title ||
                !pullRequest.url ||
                !pullRequest.headRefName ||
                !pullRequest.baseRefName ||
                !state
            ) {
                return null;
            }

            return {
                additions: pullRequest.additions ?? 0,
                assignees: normalizeAuthors(pullRequest.assignees),
                author: normalizeAuthor(pullRequest.author),
                baseBranchName: pullRequest.baseRefName,
                branchName: pullRequest.headRefName,
                changedFiles: pullRequest.changedFiles ?? 0,
                deletions: pullRequest.deletions ?? 0,
                isDraft: Boolean(pullRequest.isDraft),
                latestReviews: normalizeLatestReviews(
                    pullRequest.latestReviews,
                ),
                number: pullRequest.number,
                reviewRequests: normalizeAuthors(pullRequest.reviewRequests),
                state,
                title: pullRequest.title,
                updatedAt: pullRequest.updatedAt ?? null,
                url: pullRequest.url,
            };
        })
        .filter((item): item is GitHubPullRequest => Boolean(item));
}

export async function findGitHubRepository(project: ProjectConfig) {
    const [error, output] = await tryPromise(
        ghText(
            ["repo", "view", "--json", "nameWithOwner,url,defaultBranchRef"],
            {
                cwd: project.path,
            },
        ),
    );

    if (error) {
        logger.debug(
            { projectId: project.id, projectPath: project.path, error },
            "github repository not found",
        );
        return undefined;
    }

    const [parseError, repository] = await tryPromise(
        parseJson<GitHubRepositoryPayload>(output),
    );

    if (parseError || !repository.nameWithOwner || !repository.url) {
        logger.warn(
            { projectId: project.id, projectPath: project.path, parseError },
            "github repository payload was invalid",
        );
        return undefined;
    }

    return repository;
}

export async function listGitHubPullRequests(
    project: ProjectConfig,
    repository?: GitHubRepositoryInfo,
): Promise<GitHubPullRequest[] | undefined> {
    const resolvedRepository =
        repository ?? (await findGitHubRepository(project));

    if (!resolvedRepository) {
        return undefined;
    }

    const [openPullRequests, historicalPullRequests] = await Promise.all([
        listGitHubPullRequestsByState(project, "open"),
        listGitHubPullRequestsByState(project, "closed"),
    ]);

    return [...openPullRequests, ...historicalPullRequests];
}

async function listGitHubPullRequestsByState(
    project: ProjectConfig,
    state: GitHubPullRequestListState,
) {
    const [error, output] = await tryPromise(
        ghText(
            [
                "pr",
                "list",
                "--state",
                state,
                "--limit",
                "100",
                "--json",
                PULL_REQUEST_JSON_FIELDS,
            ],
            { cwd: project.path },
        ),
    );

    if (error) {
        logger.warn(
            {
                projectId: project.id,
                projectPath: project.path,
                pullRequestState: state,
                error,
            },
            "failed to list github pull requests",
        );
        return [];
    }

    const [parseError, pullRequests] = await tryPromise(
        parseJson<GitHubPullRequestPayload[]>(output),
    );

    if (parseError) {
        logger.warn(
            {
                projectId: project.id,
                projectPath: project.path,
                pullRequestState: state,
                parseError,
            },
            "github pull request payload was invalid",
        );
        return [];
    }

    return normalizeGitHubPullRequests(pullRequests);
}

export async function getGitHubCommit(
    project: ProjectConfig,
    repository: GitHubRepositoryInfo,
    hash: string,
) {
    const [error, output] = await tryPromise(
        ghText(
            [
                "api",
                `repos/${repository.nameWithOwner}/commits/${hash}`,
                "--jq",
                "{url:.html_url,author:{login:.author.login,url:.author.html_url,avatarUrl:.author.avatar_url}}",
            ],
            { cwd: project.path },
        ),
    );

    if (error) {
        return undefined;
    }

    const [parseError, commit] = await tryPromise(
        parseJson<GitHubCommitPayload>(output),
    );

    if (parseError) {
        return undefined;
    }

    return {
        author: normalizeAuthor(commit.author),
        url: commit.url ?? undefined,
    };
}
