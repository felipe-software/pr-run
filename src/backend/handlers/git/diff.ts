import { gitText } from "@/backend/handlers/git/command";
import { tryPromise } from "@/backend/handlers/error";
import {
    ensureRemoteRefs,
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

    const comparison = `${defaultRemoteName}...${remoteName}`;
    const [numstatOutput, nameStatusOutput] = await Promise.all([
        gitText(projectPath, [
            "diff",
            "--numstat",
            "--find-renames",
            comparison,
        ]),
        gitText(projectPath, [
            "diff",
            "--name-status",
            "--find-renames",
            comparison,
        ]),
    ]);

    return mergeDiffFileMetadata(
        parseDiffNumstat(numstatOutput),
        parseDiffNameStatus(nameStatusOutput),
    );
}

export function parseDiffNumstat(output: string): BranchDiffFile[] {
    return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [additionsValue, deletionsValue, ...pathParts] =
                line.split("\t");
            const rawPath = pathParts.join("\t");
            const path = normalizeNumstatPath(rawPath);
            const isBinary = additionsValue === "-" || deletionsValue === "-";

            return {
                additions: numberOrZero(additionsValue),
                deletions: numberOrZero(deletionsValue),
                path,
                status: isBinary ? ("binary" as const) : ("modified" as const),
            };
        })
        .filter((file) => file.path.length > 0);
}

type DiffNameStatus = Pick<BranchDiffFile, "path" | "previousPath" | "status">;

export function parseDiffNameStatus(output: string): DiffNameStatus[] {
    return output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line): DiffNameStatus => {
            const [code = "M", firstPath = "", secondPath] = line.split("\t");
            const statusCode = code[0];

            if (statusCode === "R" && secondPath) {
                return {
                    path: secondPath,
                    previousPath: firstPath,
                    status: "renamed",
                };
            }

            const status =
                statusCode === "A"
                    ? "added"
                    : statusCode === "D"
                      ? "deleted"
                      : "modified";

            return { path: firstPath, status };
        });
}

function mergeDiffFileMetadata(
    files: BranchDiffFile[],
    statuses: DiffNameStatus[],
) {
    const statusByPath = new Map(statuses.map((item) => [item.path, item]));

    return files.map((file) => {
        const metadata = statusByPath.get(file.path);

        return {
            ...file,
            previousPath: metadata?.previousPath,
            status:
                file.status === "binary"
                    ? file.status
                    : (metadata?.status ?? file.status),
        };
    });
}

function normalizeNumstatPath(path: string) {
    const renameMatch = path.match(/^(.*?)\{(.*?) => (.*?)\}(.*)$/);

    if (!renameMatch) {
        return path;
    }

    return `${renameMatch[1]}${renameMatch[3]}${renameMatch[4]}`;
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
            await ensureRemoteRefs(project.path, [remoteName]);
            const defaultRemoteName = await getDefaultRemoteBranch(
                project.path,
            );
            const baseRemoteName = baseBranch
                ? remoteBranch(baseBranch).remoteName
                : defaultRemoteName;
            await ensureRemoteRefs(project.path, [baseRemoteName, remoteName]);
            const [files, patch] = await Promise.all([
                getBranchDiffFiles(project.path, baseRemoteName, remoteName),
                getBranchDiffPatch(project.path, baseRemoteName, remoteName),
            ]);

            return {
                additions: files.reduce(
                    (total, file) => total + file.additions,
                    0,
                ),
                branch: name,
                deletions: files.reduce(
                    (total, file) => total + file.deletions,
                    0,
                ),
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
