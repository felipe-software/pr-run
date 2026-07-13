import { gitText } from "@/backend/handlers/git/command";
import {
    gitError,
    parseWorktreeList,
    remoteBranch,
    type WorktreeRecord,
} from "@/backend/handlers/git/helpers";
import type { ProjectConfig } from "@/backend/types";
import { tryPromise } from "@/backend/handlers/error";
import { ApiError } from "@/backend/types";

export type WorktreeInventory = {
    byBranch: Map<string, WorktreeRecord>;
    worktrees: WorktreeRecord[];
};

export function buildWorktreeMap(worktrees: WorktreeRecord[]) {
    const byBranch = new Map<string, WorktreeRecord>();

    for (const worktree of worktrees) {
        if (!worktree.branch) {
            continue;
        }

        byBranch.set(worktree.branch.replace(/^refs\/heads\//, ""), worktree);
    }

    return byBranch;
}

export async function listWorktreeInventory(
    project: ProjectConfig,
): Promise<WorktreeInventory> {
    const [error, output] = await tryPromise(
        gitText(project.path, ["worktree", "list", "--porcelain"]),
    );

    if (error) {
        throw gitError("Failed to list project worktrees.", error);
    }

    const worktrees = parseWorktreeList(output);

    return {
        byBranch: buildWorktreeMap(worktrees),
        worktrees,
    };
}

export async function requireWorktreePath(
    project: ProjectConfig,
    branch: string,
) {
    const { name } = remoteBranch(branch);
    const worktree = (await listWorktreeInventory(project)).byBranch.get(name);

    if (!worktree) {
        return null;
    }

    return worktree.path;
}

export async function getWorktreePathOrThrow(
    project: ProjectConfig,
    branch: string,
    message = "No worktree exists for this branch yet.",
) {
    const worktreePath = await requireWorktreePath(project, branch);

    if (!worktreePath) {
        throw new ApiError("WORKTREE_NOT_FOUND", message, 404);
    }

    return worktreePath;
}
