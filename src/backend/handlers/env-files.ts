import { lstat, readFile, readlink } from "node:fs/promises";
import path from "node:path";

import { tryPromise } from "@/backend/handlers/error";
import {
    linkSharedEnv,
    listEnvFileNames,
    worktreePathFor,
} from "@/backend/handlers/git/helpers";
import {
    ApiError,
    type EnvFileItem,
    type EnvFilesOverviewResult,
    type ProjectConfig,
} from "@/backend/types";

async function getWorktreePath(project: ProjectConfig, branch: string) {
    const worktreePath = worktreePathFor(project.path, branch);
    const [statError, worktreeStat] = await tryPromise(lstat(worktreePath));

    if (statError || !worktreeStat.isDirectory()) {
        throw new ApiError(
            "WORKTREE_NOT_FOUND",
            "No worktree exists for this branch yet.",
            404,
        );
    }

    return worktreePath;
}

async function getEnvFilesOverview(
    project: ProjectConfig,
    branch: string,
): Promise<EnvFilesOverviewResult> {
    const worktreePath = await getWorktreePath(project, branch);
    await linkSharedEnv(project.path, worktreePath);
    const [listError, envFileNames] = await tryPromise(
        listEnvFileNames(worktreePath),
    );

    if (listError) {
        throw new ApiError(
            "ENV_FILES_READ_FAILED",
            "Failed to list env files in the worktree.",
            500,
            listError.message,
        );
    }

    const files = await Promise.all(
        envFileNames.map(
            async (fileName) =>
                await readEnvFile(path.join(worktreePath, fileName), fileName),
        ),
    );

    return {
        branch,
        files,
        worktreePath,
    };
}

async function readEnvFile(
    filePath: string,
    fileName: string,
): Promise<EnvFileItem> {
    const [statError, fileStat] = await tryPromise(lstat(filePath));

    if (statError) {
        return {
            isSymbolicLink: false,
            name: fileName,
            readError: statError.message,
        };
    }

    const isSymbolicLink = fileStat.isSymbolicLink();
    const [linkError, linkedPath] = isSymbolicLink
        ? await tryPromise(readlink(filePath))
        : [null, undefined];
    const [readError, content] = await tryPromise(readFile(filePath, "utf8"));

    return {
        content: content ?? undefined,
        isSymbolicLink,
        linkedPath: linkError ? undefined : linkedPath,
        name: fileName,
        readError: readError?.message,
    };
}

export const envFilesHandler = {
    getEnvFilesOverview,
};
