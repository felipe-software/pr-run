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
    type BranchFileContent,
    type FileCommitInfo,
    type ProjectConfig,
} from "@/backend/types";
import {
    findGitHubRepository,
    getGitHubCommitDiff,
    getGitHubPullRequestDiff,
} from "@/backend/handlers/git/github";

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
                commits: [],
                deletions: numberOrZero(deletionsValue),
                path,
                status: isBinary ? ("binary" as const) : ("modified" as const),
            };
        })
        .filter((file) => file.path.length > 0);
}

type DiffNameStatus = Pick<BranchDiffFile, "path" | "previousPath" | "status">;

export function parseFileCommitHistory(output: string) {
    const commitsByPath = new Map<string, FileCommitInfo[]>();

    for (const record of output.split("\x1e")) {
        const [metadata = "", ...paths] = record.trim().split("\n");
        const [hash, shortHash, subject, authorName, date] =
            metadata.split("\x1f");

        if (!hash || !shortHash || !subject || !authorName || !date) {
            continue;
        }

        const commit = { authorName, date, hash, shortHash, subject };

        for (const path of new Set(paths.filter(Boolean))) {
            const commits = commitsByPath.get(path) ?? [];
            commits.push(commit);
            commitsByPath.set(path, commits);
        }
    }

    return commitsByPath;
}

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

    if (renameMatch) {
        return `${renameMatch[1]}${renameMatch[3]}${renameMatch[4]}`;
    }

    return path.match(/^.*? => (.*)$/)?.[1] ?? path;
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

async function getFileCommitHistory(
    projectPath: string,
    baseRemoteName: string | undefined,
    remoteName: string,
) {
    if (!baseRemoteName || baseRemoteName === remoteName) {
        return new Map<string, FileCommitInfo[]>();
    }

    const output = await gitText(projectPath, [
        "log",
        `${baseRemoteName}..${remoteName}`,
        "--find-renames",
        "--format=%x1e%H%x1f%h%x1f%s%x1f%an%x1f%cI",
        "--name-only",
    ]);

    return parseFileCommitHistory(output);
}

function attachFileCommits(
    files: BranchDiffFile[],
    commitsByPath: Map<string, FileCommitInfo[]>,
) {
    return files.map((file) => ({
        ...file,
        commits:
            commitsByPath.get(file.path) ??
            (file.previousPath
                ? commitsByPath.get(file.previousPath)
                : undefined) ??
            [],
    }));
}

export async function getBranchDiff(
    project: ProjectConfig,
    branch: string,
    baseBranch?: string,
    pullRequestNumber?: number,
): Promise<BranchDiffResult> {
    if (pullRequestNumber) {
        const repository = await findGitHubRepository(project);

        if (repository) {
            const result = await getGitHubPullRequestDiff(
                project,
                repository,
                pullRequestNumber,
                branch,
            );
            const { remoteName } = remoteBranch(branch);
            const baseRemoteName = baseBranch
                ? remoteBranch(baseBranch).remoteName
                : await getDefaultRemoteBranch(project.path);
            const [historyError, commitsByPath] = await tryPromise(
                getFileCommitHistory(project.path, baseRemoteName, remoteName),
            );

            return {
                ...result,
                files: attachFileCommits(
                    result.files,
                    historyError || !commitsByPath ? new Map() : commitsByPath,
                ),
            };
        }
    }
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
            const [files, patch, commitsByPath] = await Promise.all([
                getBranchDiffFiles(project.path, baseRemoteName, remoteName),
                getBranchDiffPatch(project.path, baseRemoteName, remoteName),
                getFileCommitHistory(project.path, baseRemoteName, remoteName),
            ]);

            const filesWithCommits = attachFileCommits(files, commitsByPath);

            return {
                additions: filesWithCommits.reduce(
                    (total, file) => total + file.additions,
                    0,
                ),
                branch: name,
                deletions: filesWithCommits.reduce(
                    (total, file) => total + file.deletions,
                    0,
                ),
                files: filesWithCommits,
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

export async function getBranchFileContent(
    project: ProjectConfig,
    branch: string,
    path: string,
): Promise<BranchFileContent> {
    const { name, remoteName } = remoteBranch(branch);
    const [error, contents] = await tryPromise(
        (async () => {
            await ensureRemoteRefs(project.path, [remoteName]);
            return await gitText(project.path, [
                "show",
                `${remoteName}:${path}`,
            ]);
        })(),
    );

    if (error) {
        throw new ApiError(
            "FILE_NOT_FOUND",
            "Could not read this file from the branch.",
            404,
            error instanceof Error ? error.message : String(error),
        );
    }

    return { branch: name, contents, path };
}

export async function getCommitDiff(
    project: ProjectConfig,
    hash: string,
): Promise<BranchDiffResult> {
    const [error, result] = await tryPromise(
        (async () => {
            const [numstatOutput, nameStatusOutput, patch] = await Promise.all([
                gitText(project.path, [
                    "show",
                    "--format=",
                    "--numstat",
                    "--find-renames",
                    hash,
                ]),
                gitText(project.path, [
                    "show",
                    "--format=",
                    "--name-status",
                    "--find-renames",
                    hash,
                ]),
                gitText(project.path, [
                    "show",
                    "--format=",
                    "--patch",
                    "--find-renames",
                    hash,
                ]),
            ]);
            const files = mergeDiffFileMetadata(
                parseDiffNumstat(numstatOutput),
                parseDiffNameStatus(nameStatusOutput),
            );

            return {
                additions: files.reduce(
                    (total, file) => total + file.additions,
                    0,
                ),
                branch: hash,
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
        const repository = await findGitHubRepository(project);
        const [githubError, githubDiff] = await tryPromise(
            repository
                ? getGitHubCommitDiff(project, repository, hash)
                : Promise.reject(error),
        );

        if (!githubError && githubDiff) {
            return githubDiff;
        }

        throw new ApiError(
            "COMMIT_NOT_FOUND",
            "Could not read the changes for this commit.",
            404,
            error instanceof Error ? error.message : String(error),
        );
    }

    return result;
}
