import { mkdir } from "node:fs/promises";
import path from "node:path";

import { tryPromise } from "@/backend/handlers/error";
import {
    gitCommandErrorText,
    gitQuiet,
    gitText,
} from "@/backend/handlers/git/command";
import {
    exists,
    gitError,
    hasLocalBranch,
    linkSharedEnv,
    normalizeBranchName,
    parseWorktreeList,
    remoteBranch,
    worktreePathFor,
    STALE_BRANCH_DAYS,
} from "@/backend/handlers/git/helpers";
import {
    findGitHubRepository,
    listGitHubPullRequests,
} from "@/backend/handlers/git/github";
import { logger } from "@/backend/logger";
import {
    ApiError,
    type BranchInfo,
    type CheckoutResult,
    type ProjectConfig,
    type RemoveWorktreeResult,
    type UpdateResult,
    type UpdateWorktreesResult,
} from "@/backend/types";

export async function listBranches(
    project: ProjectConfig,
): Promise<BranchInfo[]> {
    const repository = await findGitHubRepository(project);
    const [pullRequests, branches] = await Promise.all([
        listGitHubPullRequests(project, repository),
        listRemoteBranches(project, repository),
    ]);

    if (!repository || pullRequests === undefined) {
        return branches;
    }

    const pullRequestBranchNames = new Set(
        pullRequests.map((pullRequest) => pullRequest.branchName),
    );
    const pullRequestBranches = await Promise.all(
        pullRequests.map(async (pullRequest) => {
            const worktreePath = worktreePathFor(
                project.path,
                pullRequest.branchName,
            );
            const lastCommitTimestamp = pullRequest.updatedAt
                ? Date.parse(pullRequest.updatedAt)
                : null;

            return {
                name: pullRequest.branchName,
                remoteName: `origin/${pullRequest.branchName}`,
                worktreePath,
                hasWorktree: await exists(worktreePath),
                lastCommitTimestamp: Number.isFinite(lastCommitTimestamp)
                    ? lastCommitTimestamp
                    : null,
                isStale: false,
                source: "pull-request" as const,
                compareBranchName: pullRequest.baseBranchName,
                repository,
                pullRequest: {
                    number: pullRequest.number,
                    title: pullRequest.title,
                    url: pullRequest.url,
                    baseBranchName: pullRequest.baseBranchName,
                    author: pullRequest.author,
                },
            };
        }),
    );

    return [
        ...pullRequestBranches,
        ...branches.filter(
            (branch) => !pullRequestBranchNames.has(branch.name),
        ),
    ];
}

async function listRemoteBranches(
    project: ProjectConfig,
    repository?: BranchInfo["repository"],
): Promise<BranchInfo[]> {
    const [error, output] = await tryPromise(
        gitText(project.path, [
            "for-each-ref",
            "--sort=-committerdate",
            "--format=%(refname:short)|%(committerdate:unix)",
            "refs/remotes/origin",
        ]),
    );

    if (error) {
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
                repository,
                source: "branch",
            };
        }),
    );
}

export async function checkoutBranch(
    project: ProjectConfig,
    branch: string,
): Promise<CheckoutResult> {
    const { name, remoteName } = remoteBranch(branch);
    const targetPath = worktreePathFor(project.path, name);

    const [branchError] = await tryPromise(
        gitQuiet(project.path, [
            "rev-parse",
            "--verify",
            `refs/remotes/origin/${name}`,
        ]),
    );

    if (branchError) {
        if (branchError instanceof ApiError) {
            throw branchError;
        }

        throw new ApiError(
            "BRANCH_NOT_FOUND",
            "Branch was not found on the remote.",
            404,
            branchError instanceof Error
                ? branchError.message
                : String(branchError),
        );
    }

    if (await exists(targetPath)) {
        await linkSharedEnv(project.path, targetPath);

        return {
            status: "ready",
            branch: name,
            worktreePath: targetPath,
            message: "worktree ready",
        };
    }

    await mkdir(path.dirname(targetPath), { recursive: true });

    const [checkoutError] = await tryPromise(
        (async () => {
            if (await hasLocalBranch(project.path, name)) {
                const [worktreeError] = await tryPromise(
                    gitQuiet(project.path, [
                        "worktree",
                        "add",
                        targetPath,
                        name,
                    ]),
                );

                if (worktreeError) {
                    if (
                        !gitCommandErrorText(worktreeError).includes(
                            "is already checked out",
                        )
                    ) {
                        throw worktreeError;
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
        })(),
    );

    if (checkoutError) {
        throw gitError("Failed to create the worktree.", checkoutError);
    }

    logger.info({ branch: name, targetPath }, "worktree created");

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

    const [error] = await tryPromise(
        (async () => {
            await gitQuiet(project.path, ["fetch", "origin"]);
            await gitQuiet(targetPath, ["reset", "--hard", remoteName]);
        })(),
    );

    if (error) {
        throw gitError("Failed to update the worktree.", error);
    }

    await linkSharedEnv(project.path, targetPath);

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

    const [error] = await tryPromise(
        gitQuiet(project.path, ["worktree", "remove", "--force", targetPath]),
    );

    if (error) {
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

    let output = "";

    const [listError] = await tryPromise(
        (async () => {
            await gitQuiet(project.path, ["fetch", "origin"]);
            output = await gitText(project.path, [
                "worktree",
                "list",
                "--porcelain",
            ]);
        })(),
    );

    if (listError) {
        throw gitError("Failed to list project worktrees.", listError);
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

        const [error] = await tryPromise(
            gitQuiet(worktree.path, [
                "reset",
                "--hard",
                `origin/${branchName}`,
            ]),
        );

        if (error) {
            throw gitError(
                `Failed to update worktree ${worktree.path}.`,
                error,
            );
        }

        updatedCount += 1;
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
