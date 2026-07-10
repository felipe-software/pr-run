import { gitText } from "@/backend/handlers/git/command";
import { tryPromise } from "@/backend/handlers/error";
import {
    ensureRemoteRefs,
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
            await ensureRemoteRefs(project.path, [remoteName]);
            const defaultRemoteName = await getDefaultRemoteBranch(
                project.path,
            );
            const baseRemoteName = baseBranch
                ? remoteBranch(baseBranch).remoteName
                : defaultRemoteName;
            await ensureRemoteRefs(project.path, [baseRemoteName, remoteName]);
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
                "--numstat",
                "--format=%x1e%H%x1f%h%x1f%s%x1f%an%x1f%ae%x1f%cI",
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

    const commits = parseCommitHistory(output).map((commit) => ({
        ...commit,
        isInSelectedBranch:
            branchOnlyCommitHashes?.has(commit.hash) ??
            marksAllCommitsAsSelectedBranch,
    }));

    return await enrichCommitsWithGitHub(project, commits);
}

export function parseCommitHistory(output: string): CommitInfo[] {
    return output
        .split("\x1e")
        .map((record) => record.trim())
        .filter(Boolean)
        .map((record) => {
            const [metadata = "", ...statLines] = record.split("\n");
            const [hash, shortHash, subject, authorName, authorEmail, date] =
                metadata.split("\x1f");
            let additions = 0;
            let deletions = 0;
            let hasBinaryChanges = false;
            let hasTextChanges = false;

            for (const line of statLines) {
                const [additionValue, deletionValue] = line.split("\t");

                if (additionValue === "-" || deletionValue === "-") {
                    hasBinaryChanges = true;
                    continue;
                }

                const additionCount = Number(additionValue);
                const deletionCount = Number(deletionValue);

                if (
                    !Number.isFinite(additionCount) ||
                    !Number.isFinite(deletionCount)
                ) {
                    continue;
                }

                additions += additionCount;
                deletions += deletionCount;
                hasTextChanges = true;
            }

            return {
                additions: hasTextChanges ? additions : undefined,
                authorEmail,
                authorName,
                date,
                deletions: hasTextChanges ? deletions : undefined,
                hasBinaryChanges,
                hash,
                isInSelectedBranch: false,
                shortHash,
                subject,
            };
        });
}
