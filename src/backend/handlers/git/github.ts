import { tryPromise } from "@/backend/handlers/error";
import { logger } from "@/backend/logger";
import type {
    GitHubRepositoryInfo,
    GitHubUserInfo,
    ProjectConfig,
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
    author?: GitHubAuthorPayload | null;
    baseRefName?: string | null;
    headRefName?: string | null;
    number?: number | null;
    title?: string | null;
    updatedAt?: string | null;
    url?: string | null;
};

type GitHubCommitPayload = {
    author?: GitHubAuthorPayload | null;
    url?: string | null;
};

export type GitHubPullRequest = {
    author?: GitHubUserInfo;
    baseBranchName: string;
    branchName: string;
    number: number;
    title: string;
    updatedAt: string | null;
    url: string;
};

type GhCommandOptions = {
    cwd?: string;
};

function ghEnvironment() {
    return {
        ...process.env,
        GH_PROMPT_DISABLED: "1",
    };
}

async function ghText(args: string[], options: GhCommandOptions = {}) {
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
        throw new Error(stderr.trim() || `gh exited with code ${exitCode}.`);
    }

    return stdout;
}

async function parseJson<T>(value: string): Promise<T> {
    return JSON.parse(value) as T;
}

function normalizeAuthor(
    author: GitHubAuthorPayload | null | undefined,
): GitHubUserInfo | undefined {
    if (!author?.login || !author.url || !author.avatarUrl) {
        return undefined;
    }

    return {
        avatarUrl: author.avatarUrl,
        login: author.login,
        url: author.url,
    };
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

    const [error, output] = await tryPromise(
        ghText(
            [
                "pr",
                "list",
                "--state",
                "open",
                "--limit",
                "100",
                "--json",
                "number,title,headRefName,baseRefName,author,url,updatedAt",
            ],
            { cwd: project.path },
        ),
    );

    if (error) {
        logger.warn(
            { projectId: project.id, projectPath: project.path, error },
            "failed to list github pull requests",
        );
        return [];
    }

    const [parseError, pullRequests] = await tryPromise(
        parseJson<GitHubPullRequestPayload[]>(output),
    );

    if (parseError) {
        logger.warn(
            { projectId: project.id, projectPath: project.path, parseError },
            "github pull request payload was invalid",
        );
        return [];
    }

    return pullRequests
        .map((pullRequest) => {
            if (
                !pullRequest.number ||
                !pullRequest.title ||
                !pullRequest.url ||
                !pullRequest.headRefName ||
                !pullRequest.baseRefName
            ) {
                return null;
            }

            return {
                author: normalizeAuthor(pullRequest.author),
                baseBranchName: pullRequest.baseRefName,
                branchName: pullRequest.headRefName,
                number: pullRequest.number,
                title: pullRequest.title,
                updatedAt: pullRequest.updatedAt ?? null,
                url: pullRequest.url,
            };
        })
        .filter((item): item is GitHubPullRequest => Boolean(item));
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
