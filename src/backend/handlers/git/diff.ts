import { gitText } from "@/backend/handlers/git/command";
import { tryPromise } from "@/backend/handlers/error";
import {
    getDefaultRemoteBranch,
    numberOrZero,
    remoteBranch,
} from "@/backend/handlers/git/helpers";
import {
    ApiError,
    type BranchDiffFile,
    type BranchDiffResult,
    type ProjectConfig,
} from "@/backend/types";

async function getBranchDiffFiles(
    projectPath: string,
    defaultRemoteName: string | undefined,
    remoteName: string,
): Promise<BranchDiffFile[]> {
    if (!defaultRemoteName || defaultRemoteName === remoteName) {
        return [];
    }

    const output = await gitText(projectPath, [
        "diff",
        "--numstat",
        `${defaultRemoteName}...${remoteName}`,
    ]);

    return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [additionsValue, deletionsValue, ...pathParts] =
                line.split("\t");

            return {
                path: pathParts.join("\t"),
                additions: numberOrZero(additionsValue),
                deletions: numberOrZero(deletionsValue),
            };
        })
        .filter((file) => file.path.length > 0);
}

async function getBranchDiffPatch(
    projectPath: string,
    defaultRemoteName: string | undefined,
    remoteName: string,
) {
    if (!defaultRemoteName || defaultRemoteName === remoteName) {
        return "";
    }

    return await gitText(projectPath, [
        "diff",
        "--patch",
        `${defaultRemoteName}...${remoteName}`,
    ]);
}

export async function getBranchDiff(
    project: ProjectConfig,
    branch: string,
    baseBranch?: string,
): Promise<BranchDiffResult> {
    const { name, remoteName } = remoteBranch(branch);

    const [error, branchDiff] = await tryPromise(
        (async () => {
            const defaultRemoteName = await getDefaultRemoteBranch(
                project.path,
            );
            const baseRemoteName = baseBranch
                ? remoteBranch(baseBranch).remoteName
                : defaultRemoteName;
            const [files, patch] = await Promise.all([
                getBranchDiffFiles(project.path, baseRemoteName, remoteName),
                getBranchDiffPatch(project.path, baseRemoteName, remoteName),
            ]);

            return {
                branch: name,
                files,
                patch,
            };
        })(),
    );

    if (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            "BRANCH_NOT_FOUND",
            "Could not read diff for this branch.",
            404,
            error instanceof Error ? error.message : String(error),
        );
    }

    return branchDiff;
}
