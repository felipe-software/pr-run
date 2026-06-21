import { mkdir } from "node:fs/promises";
import path from "node:path";

import { tryPromise } from "@/backend/handlers/error";
import {
    gitCommandErrorText,
    gitQuiet,
    gitText,
} from "@/backend/handlers/git/command";
import {
    gitError,
    hasLocalBranch,
    linkSharedEnv,
    normalizeBranchName,
    remoteBranch,
    worktreePathFor,
    STALE_BRANCH_DAYS,
} from "@/backend/handlers/git/helpers";
import {
    listWorktreeInventory,
    requireWorktreePath,
    type WorktreeInventory,
} from "@/backend/handlers/git/worktree-inventory";
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
    existingInventory?: WorktreeInventory,
): Promise<BranchInfo[]> {
    const [repository, inventory] = await Promise.all([
        findGitHubRepository(project),
        existingInventory ?? listWorktreeInventory(project),
    ]);
    const [pullRequests, branches] = await Promise.all([
        listGitHubPullRequests(project, repository),
        listRemoteBranches(project, inventory, repository),
    ]);

    if (!repository || pullRequests === undefined) {
        return branches;
    }

    const pullRequestBranchNames = new Set(
        pullRequests.map((pullRequest) => pullRequest.branchName),
    );
    const pullRequestBranches = pullRequests.map((pullRequest) => {
        const worktree = inventory.byBranch.get(pullRequest.branchName);
        const lastCommitTimestamp = pullRequest.updatedAt
            ? Date.parse(pullRequest.updatedAt)
            : null;

        return {
            name: pullRequest.branchName,
            remoteName: `origin/${pullRequest.branchName}`,
            worktreePath:
                worktree?.path ??
                worktreePathFor(project.path, pullRequest.branchName),
            hasWorktree: Boolean(worktree),
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
    });

    return [
        ...pullRequestBranches,
        ...branches.filter(
            (branch) => !pullRequestBranchNames.has(branch.name),
        ),
    ];
}

async function listRemoteBranches(
    project: ProjectConfig,
    inventory: WorktreeInventory,
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

    return branches.map((branch) => {
        const worktree = inventory.byBranch.get(branch.name);

        return {
            name: branch.name,
            remoteName: branch.remoteName,
            worktreePath:
                worktree?.path ?? worktreePathFor(project.path, branch.name),
            hasWorktree: Boolean(worktree),
            lastCommitTimestamp: branch.lastCommitTimestamp,
            isStale: branch.isStale,
            repository,
            source: "branch",
        };
    });
}

export async function checkoutBranch(
    project: ProjectConfig,
    branch: string,
): Promise<CheckoutResult> {
    const { name, remoteName } = remoteBranch(branch);
    const targetPath = worktreePathFor(project.path, name);
    const registeredPath = await requireWorktreePath(project, name);

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

    if (registeredPath) {
        await linkSharedEnv(project.path, registeredPath);

        return {
            status: "ready",
            branch: name,
            worktreePath: registeredPath,
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
    const targetPath = await requireWorktreePath(project, name);

    if (!targetPath) {
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
    const targetPath = await requireWorktreePath(project, name);

    if (!targetPath) {
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

    const [listError, inventory] = await tryPromise(
        (async () => {
            await gitQuiet(project.path, ["fetch", "origin"]);
            return await listWorktreeInventory(project);
        })(),
    );

    if (listError) {
        throw gitError("Failed to list project worktrees.", listError);
    }

    const remoteBranches = (await listBranches(project, inventory)).map(
        (branch) => ({
            name: branch.name,
            normalizedName: normalizeBranchName(branch.name),
        }),
    );
    const worktrees = inventory.worktrees.filter((item) =>
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
