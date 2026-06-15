import { gitText } from "@/backend/handlers/git/command";
import { tryPromise } from "@/backend/handlers/error";
import {
    getDefaultRemoteBranch,
    remoteBranch,
} from "@/backend/handlers/git/helpers";
import {
    findGitHubRepository,
    getGitHubCommit,
} from "@/backend/handlers/git/github";
import { ApiError, type CommitInfo, type ProjectConfig } from "@/backend/types";

async function getBranchOnlyCommitHashes(
    projectPath: string,
    baseRemoteName: string | undefined,
    remoteName: string,
) {
    if (!baseRemoteName || baseRemoteName === remoteName) {
        return undefined;
    }

    const output = await gitText(projectPath, [
        "log",
        `${baseRemoteName}..${remoteName}`,
        "--pretty=format:%H",
    ]);

    return new Set(output.split("\n").filter(Boolean));
}

function githubUserFromEmail(authorEmail: string) {
    const login = authorEmail.match(
        /^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$/,
    )?.[1];

    if (!login) {
        return undefined;
    }

    return {
        avatarUrl: `https://github.com/${login}.png?size=64`,
        login,
        url: `https://github.com/${login}`,
    };
}

async function enrichCommitsWithGitHub(
    project: ProjectConfig,
    commits: CommitInfo[],
) {
    const repository = await findGitHubRepository(project);

    if (!repository) {
        return commits;
    }

    const details = await Promise.all(
        commits.map((commit) =>
            getGitHubCommit(project, repository, commit.hash),
        ),
    );

    return commits.map((commit, index) => {
        const githubUser =
            details[index]?.author ?? githubUserFromEmail(commit.authorEmail);

        return {
            ...commit,
            authorAvatarUrl: githubUser?.avatarUrl,
            authorLogin: githubUser?.login,
            authorUrl: githubUser?.url,
            url:
                details[index]?.url ??
                `${repository.url.replace(/\/$/, "")}/commit/${commit.hash}`,
        };
    });
}

export async function getCommitHistory(
    project: ProjectConfig,
    branch: string,
    baseBranch?: string,
): Promise<CommitInfo[]> {
    const { remoteName } = remoteBranch(branch);

    let output = "";
    let branchOnlyCommitHashes: Set<string> | undefined;
    let marksAllCommitsAsSelectedBranch = true;

    const [error] = await tryPromise(
        (async () => {
            const defaultRemoteName = await getDefaultRemoteBranch(
                project.path,
            );
            const baseRemoteName = baseBranch
                ? remoteBranch(baseBranch).remoteName
                : defaultRemoteName;
            marksAllCommitsAsSelectedBranch = baseRemoteName
                ? baseRemoteName === remoteName
                : true;
            branchOnlyCommitHashes = await getBranchOnlyCommitHashes(
                project.path,
                baseRemoteName,
                remoteName,
            );
            output = await gitText(project.path, [
                "log",
                remoteName,
                "-n",
                "30",
                "--pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%cI",
            ]);
        })(),
    );

    if (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            "BRANCH_NOT_FOUND",
            "Could not read commit history for this branch.",
            404,
            error instanceof Error ? error.message : String(error),
        );
    }

    const commits = output
        .split("\n")
        .filter(Boolean)
        .map((line) => {
            const [hash, shortHash, subject, authorName, authorEmail, date] =
                line.split("\x1f");

            return {
                hash,
                shortHash,
                subject,
                authorName,
                authorEmail,
                date,
                isInSelectedBranch:
                    branchOnlyCommitHashes?.has(hash) ??
                    marksAllCommitsAsSelectedBranch,
            };
        });

    return await enrichCommitsWithGitHub(project, commits);
}
