import { gitText } from "@/backend/handlers/git/command";
import { tryPromise } from "@/backend/handlers/error";
import {
    getDefaultRemoteBranch,
    remoteBranch,
} from "@/backend/handlers/git/helpers";
import { ApiError, type CommitInfo, type ProjectConfig } from "@/backend/types";

async function getBranchOnlyCommitHashes(
    projectPath: string,
    defaultRemoteName: string | undefined,
    remoteName: string,
) {
    if (!defaultRemoteName || defaultRemoteName === remoteName) {
        return undefined;
    }

    const output = await gitText(projectPath, [
        "log",
        `${defaultRemoteName}..${remoteName}`,
        "--pretty=format:%H",
    ]);

    return new Set(output.split("\n").filter(Boolean));
}

export async function getCommitHistory(
    project: ProjectConfig,
    branch: string,
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
            marksAllCommitsAsSelectedBranch = defaultRemoteName
                ? defaultRemoteName === remoteName
                : true;
            branchOnlyCommitHashes = await getBranchOnlyCommitHashes(
                project.path,
                defaultRemoteName,
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

    return output
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
}
