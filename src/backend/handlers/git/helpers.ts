import { access, lstat, symlink } from "node:fs/promises";
import path from "node:path";

import { tryPromise } from "@/backend/handlers/error";
import {
    gitCommandErrorText,
    gitQuiet,
    gitText,
    isGitSshAuthFailure,
} from "@/backend/handlers/git/command";
import { ApiError } from "@/backend/types";

export const STALE_BRANCH_DAYS = 10;

export type WorktreeRecord = {
    path: string;
    branch?: string;
};

export function gitError(message: string, error: unknown): ApiError {
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

export function worktreePathFor(projectPath: string, branch: string) {
    return path.join(projectPath, ".pr-run", normalizeBranchName(branch));
}

export function remoteBranch(branch: string) {
    const name = branch.replace(/^origin\//, "");

    return {
        name,
        remoteName: `origin/${name}`,
    };
}

export async function exists(targetPath: string) {
    const [error] = await tryPromise(access(targetPath));
    return !error;
}

export async function hasLocalBranch(projectPath: string, branch: string) {
    const output = await gitText(projectPath, [
        "for-each-ref",
        "--format=%(refname)",
        `refs/heads/${branch}`,
    ]);

    return output
        .split("\n")
        .some((line) => line.trim() === `refs/heads/${branch}`);
}

export async function getDefaultRemoteBranch(projectPath: string) {
    const [error, output] = await tryPromise(
        gitText(projectPath, [
            "symbolic-ref",
            "--quiet",
            "--short",
            "refs/remotes/origin/HEAD",
        ]),
    );

    if (!error) {
        const remoteName = output.trim();

        if (remoteName) {
            return remoteName;
        }
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

export async function validateProjectPath(projectPath: string) {
    const [statError, stat] = await tryPromise(lstat(projectPath));

    if (statError) {
        throw new ApiError(
            "INVALID_PROJECT_PATH",
            "The provided directory does not exist.",
            400,
            statError instanceof Error ? statError.message : String(statError),
        );
    }

    if (!stat.isDirectory()) {
        throw new ApiError(
            "INVALID_PROJECT_PATH",
            "The provided path is not a directory.",
        );
    }

    const [gitError] = await tryPromise(
        gitQuiet(projectPath, ["rev-parse", "--show-toplevel"]),
    );

    if (gitError) {
        throw new ApiError(
            "NOT_A_GIT_REPOSITORY",
            "This directory does not look like a Git repository.",
            400,
            gitError instanceof Error ? gitError.message : String(gitError),
        );
    }
}

export async function linkSharedEnv(projectPath: string, targetPath: string) {
    const source = path.join(projectPath, ".env");
    const destination = path.join(targetPath, ".env");

    if (!(await exists(source)) || (await exists(destination))) {
        return;
    }

    await tryPromise(symlink(source, destination));
}

export function parseWorktreeList(output: string): WorktreeRecord[] {
    const worktrees: WorktreeRecord[] = [];
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

export function numberOrZero(value: string | undefined) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
}
