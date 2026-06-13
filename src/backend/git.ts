import { access, lstat, mkdir, symlink } from "node:fs/promises";
import path from "node:path";

import {
    gitCommandErrorText,
    gitQuiet,
    gitText,
    isGitSshAuthFailure,
} from "./git-command";
import { logger } from "./logger";
import {
    ApiError,
    type BranchDiffFile,
    type BranchDiffResult,
    type BranchInfo,
    type CheckoutResult,
    type CommitInfo,
    type ProjectConfig,
    type RemoveWorktreeResult,
    type UpdateResult,
    type UpdateWorktreesResult,
} from "./types";

const STALE_BRANCH_DAYS = 10;

function gitError(message: string, error: unknown): ApiError {
    if (error instanceof ApiError) {
        return error;
    }

    if (isGitSshAuthFailure(error)) {
        return new ApiError(
            "SSH_AUTH_REQUIRED",
            "SSH needs a passphrase. Enter the SSH passphrase in the app.",
            401,
            gitCommandErrorText(error),
            { action: "prompt_ssh_passphrase" },
        );
    }

    return new ApiError(
        "GIT_COMMAND_FAILED",
        message,
        500,
        error instanceof Error ? error.message : String(error),
    );
}

export function normalizeBranchName(branch: string) {
    return branch
        .replace(/^origin\//, "")
        .replace(/\//g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function worktreePathFor(projectPath: string, branch: string) {
    return path.join(projectPath, ".pr-run", normalizeBranchName(branch));
}

function remoteBranch(branch: string) {
    const name = branch.replace(/^origin\//, "");
    return {
        name,
        remoteName: `origin/${name}`,
    };
}

async function exists(targetPath: string) {
    try {
        await access(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function hasLocalBranch(projectPath: string, branch: string) {
    const output = await gitText(projectPath, [
        "for-each-ref",
        "--format=%(refname)",
        `refs/heads/${branch}`,
    ]);

    return output
        .split("\n")
        .some((line) => line.trim() === `refs/heads/${branch}`);
}

async function getDefaultRemoteBranch(projectPath: string) {
    try {
        const output = await gitText(projectPath, [
            "symbolic-ref",
            "--quiet",
            "--short",
            "refs/remotes/origin/HEAD",
        ]);
        const remoteName = output.trim();

        if (remoteName) {
            return remoteName;
        }
    } catch {
        // Fall through to common defaults below.
    }

    for (const remoteName of ["origin/main", "origin/master"]) {
        const output = await gitText(projectPath, [
            "for-each-ref",
            "--format=%(refname)",
            `refs/remotes/${remoteName}`,
        ]);

        if (
            output
                .split("\n")
                .some((line) => line.trim() === `refs/remotes/${remoteName}`)
        ) {
            return remoteName;
        }
    }

    return undefined;
}

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

export async function validateProjectPath(projectPath: string) {
    try {
        const stat = await lstat(projectPath);

        if (!stat.isDirectory()) {
            throw new ApiError(
                "INVALID_PROJECT_PATH",
                "The provided path is not a directory.",
            );
        }
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            "INVALID_PROJECT_PATH",
            "The provided directory does not exist.",
            400,
            error instanceof Error ? error.message : String(error),
        );
    }

    try {
        await gitQuiet(projectPath, ["rev-parse", "--show-toplevel"]);
    } catch (error) {
        throw new ApiError(
            "NOT_A_GIT_REPOSITORY",
            "This directory does not look like a Git repository.",
            400,
            error instanceof Error ? error.message : String(error),
        );
    }
}

export async function listBranches(
    project: ProjectConfig,
): Promise<BranchInfo[]> {
    let output: string;

    try {
        output = await gitText(project.path, [
            "for-each-ref",
            "--sort=-committerdate",
            "--format=%(refname:short)|%(committerdate:unix)",
            "refs/remotes/origin",
        ]);
    } catch (error) {
        throw gitError("Failed to list remote branches.", error);
    }

    const now = Date.now();
    const branches = output
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => {
            const [remoteName, timestampValue] = item.split("|");
            const lastCommitTimestamp =
                timestampValue && Number(timestampValue) > 0
                    ? Number(timestampValue) * 1000
                    : null;
            const isStale = lastCommitTimestamp
                ? now - lastCommitTimestamp >
                  STALE_BRANCH_DAYS * 24 * 60 * 60 * 1000
                : true;

            return {
                remoteName,
                name: remoteName.replace(/^origin\//, ""),
                lastCommitTimestamp,
                isStale,
            };
        })
        .filter((item) => item.remoteName.startsWith("origin/"))
        .filter((item) => item.remoteName !== "origin/HEAD")
        .sort((left, right) => {
            if (left.isStale !== right.isStale) {
                return left.isStale ? 1 : -1;
            }

            return (
                (right.lastCommitTimestamp ?? 0) -
                (left.lastCommitTimestamp ?? 0)
            );
        });

    return Promise.all(
        branches.map(async (branch) => {
            const worktreePath = worktreePathFor(project.path, branch.name);

            return {
                name: branch.name,
                remoteName: branch.remoteName,
                worktreePath,
                hasWorktree: await exists(worktreePath),
                lastCommitTimestamp: branch.lastCommitTimestamp,
                isStale: branch.isStale,
            };
        }),
    );
}

export async function getBranchDiff(
    project: ProjectConfig,
    branch: string,
): Promise<BranchDiffResult> {
    const { name, remoteName } = remoteBranch(branch);

    try {
        const defaultRemoteName = await getDefaultRemoteBranch(project.path);
        const [files, patch] = await Promise.all([
            getBranchDiffFiles(project.path, defaultRemoteName, remoteName),
            getBranchDiffPatch(project.path, defaultRemoteName, remoteName),
        ]);

        return {
            branch: name,
            files,
            patch,
        };
    } catch (error) {
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
}

export async function checkoutBranch(
    project: ProjectConfig,
    branch: string,
): Promise<CheckoutResult> {
    const { name, remoteName } = remoteBranch(branch);
    const targetPath = worktreePathFor(project.path, name);

    try {
        await gitQuiet(project.path, [
            "rev-parse",
            "--verify",
            `refs/remotes/origin/${name}`,
        ]);
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError(
            "BRANCH_NOT_FOUND",
            "Branch was not found on the remote.",
            404,
            error instanceof Error ? error.message : String(error),
        );
    }

    if (await exists(targetPath)) {
        return {
            status: "ready",
            branch: name,
            worktreePath: targetPath,
            message: "worktree ready",
        };
    }

    await mkdir(path.dirname(targetPath), { recursive: true });

    try {
        if (await hasLocalBranch(project.path, name)) {
            try {
                await gitQuiet(project.path, [
                    "worktree",
                    "add",
                    targetPath,
                    name,
                ]);
            } catch (error) {
                if (!errorText(error).includes("is already checked out")) {
                    throw error;
                }

                await gitQuiet(project.path, [
                    "worktree",
                    "add",
                    "--detach",
                    targetPath,
                    remoteName,
                ]);
            }
        } else {
            await gitQuiet(project.path, [
                "worktree",
                "add",
                "--track",
                "-b",
                name,
                targetPath,
                remoteName,
            ]);
        }
        logger.info({ branch: name, targetPath }, "worktree created");
    } catch (error) {
        throw gitError("Failed to create the worktree.", error);
    }

    await linkSharedEnv(project.path, targetPath);

    return {
        status: "created",
        branch: name,
        worktreePath: targetPath,
        message: "Worktree created.",
    };
}

export async function updateWorktree(
    project: ProjectConfig,
    branch: string,
): Promise<UpdateResult> {
    const { name, remoteName } = remoteBranch(branch);
    const targetPath = worktreePathFor(project.path, name);

    if (!(await exists(targetPath))) {
        throw new ApiError(
            "WORKTREE_NOT_FOUND",
            "No worktree exists for this branch yet.",
            404,
        );
    }

    try {
        await gitQuiet(project.path, ["fetch", "origin"]);
        await gitQuiet(targetPath, ["reset", "--hard", remoteName]);
    } catch (error) {
        throw gitError("Failed to update the worktree.", error);
    }

    return {
        status: "updated",
        branch: name,
        worktreePath: targetPath,
        message: `Worktree updated to ${remoteName}.`,
    };
}

export async function removeWorktree(
    project: ProjectConfig,
    branch: string,
): Promise<RemoveWorktreeResult> {
    const { name } = remoteBranch(branch);
    const targetPath = worktreePathFor(project.path, name);

    if (!(await exists(targetPath))) {
        throw new ApiError(
            "WORKTREE_NOT_FOUND",
            "No worktree exists for this branch yet.",
            404,
        );
    }

    try {
        await gitQuiet(project.path, [
            "worktree",
            "remove",
            "--force",
            targetPath,
        ]);
    } catch (error) {
        throw gitError("Failed to remove the worktree.", error);
    }

    return {
        status: "removed",
        branch: name,
        worktreePath: targetPath,
        message: "Worktree removed.",
    };
}

export async function updateProjectWorktrees(
    project: ProjectConfig,
): Promise<UpdateWorktreesResult> {
    const projectWorktreesRoot = path.join(project.path, ".pr-run");

    let output: string;

    try {
        await gitQuiet(project.path, ["fetch", "origin"]);
        output = await gitText(project.path, [
            "worktree",
            "list",
            "--porcelain",
        ]);
    } catch (error) {
        throw gitError("Failed to list project worktrees.", error);
    }

    const remoteBranches = (await listBranches(project)).map((branch) => ({
        name: branch.name,
        normalizedName: normalizeBranchName(branch.name),
    }));
    const worktrees = parseWorktreeList(output).filter((item) =>
        item.path.startsWith(`${projectWorktreesRoot}${path.sep}`),
    );

    if (worktrees.length === 0) {
        return {
            status: "updated",
            updatedCount: 0,
            skippedCount: 0,
            message: "No worktrees found to update.",
        };
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const worktree of worktrees) {
        const branchName =
            worktree.branch?.replace(/^refs\/heads\//, "") ??
            remoteBranches.find(
                (branch) =>
                    branch.normalizedName === path.basename(worktree.path),
            )?.name;

        if (!branchName) {
            skippedCount += 1;
            continue;
        }

        try {
            await gitQuiet(worktree.path, [
                "reset",
                "--hard",
                `origin/${branchName}`,
            ]);
            updatedCount += 1;
        } catch (error) {
            throw gitError(
                `Failed to update worktree ${worktree.path}.`,
                error,
            );
        }
    }

    logger.info({ updatedCount, skippedCount }, "project worktrees updated");

    return {
        status: "updated",
        updatedCount,
        skippedCount,
        message:
            updatedCount > 0
                ? `${updatedCount} worktree(s) updated.`
                : "No worktrees were updated.",
    };
}

export async function getCommitHistory(
    project: ProjectConfig,
    branch: string,
): Promise<CommitInfo[]> {
    const { remoteName } = remoteBranch(branch);

    let output: string;
    let branchOnlyCommitHashes: Set<string> | undefined;
    let marksAllCommitsAsSelectedBranch = true;

    try {
        const defaultRemoteName = await getDefaultRemoteBranch(project.path);
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
    } catch (error) {
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

async function linkSharedEnv(projectPath: string, targetPath: string) {
    const source = path.join(projectPath, ".env");
    const destination = path.join(targetPath, ".env");

    if (!(await exists(source)) || (await exists(destination))) {
        return;
    }

    try {
        await symlink(source, destination);
    } catch {
        // Matching review.sh behavior: .env link failures should not block checkout.
    }
}

function parseWorktreeList(output: string) {
    const worktrees: Array<{ path: string; branch?: string }> = [];
    const blocks = output.trim().split("\n\n").filter(Boolean);

    for (const block of blocks) {
        const lines = block.split("\n");
        const pathLine = lines.find((line) => line.startsWith("worktree "));

        if (!pathLine) {
            continue;
        }

        const branchLine = lines.find((line) => line.startsWith("branch "));

        worktrees.push({
            path: pathLine.replace(/^worktree /, ""),
            branch: branchLine?.replace(/^branch /, ""),
        });
    }

    return worktrees;
}

function numberOrZero(value: string | undefined) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
}
