import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { addProjectToConfig, findProject, readConfig } from "./config-store";
import {
    checkoutBranch,
    getCommitHistory,
    listBranches,
    removeWorktree,
    updateProjectWorktrees,
    updateWorktree,
    validateProjectPath,
} from "./git";
import { logger } from "./logger";
import { clearSshPassphrase, setSshPassphrase } from "./ssh-passphrase";
import { ApiError, type ApiEnvelope, type ApiMetadata } from "./types";

const port = Number(process.env.PR_RUN_BACKEND_PORT ?? 0);
const host = "127.0.0.1";

function success<T>(
    message: string,
    data: T[] = [],
    metadata: ApiMetadata = {},
): ApiEnvelope<T> {
    return {
        type: "success" as const,
        message,
        data,
        _metadata: metadata,
    };
}

function failure(
    message: string,
    metadata: ApiMetadata = {},
    data: unknown[] = [],
): ApiEnvelope<unknown> {
    return {
        type: "error" as const,
        message,
        data,
        _metadata: metadata,
    };
}

const app = new Elysia()
    .use(
        cors({
            origin: ["http://localhost:5173"],
            methods: ["GET", "POST", "OPTIONS"],
            allowedHeaders: ["content-type"],
        }),
    )
    .onRequest(({ request }) => {
        const url = new URL(request.url);
        logger.info(
            { method: request.method, path: url.pathname },
            "backend request",
        );
    })
    .onError(({ error, set }) => {
        if (error instanceof ApiError) {
            logger.error(
                {
                    code: error.code,
                    details: error.details,
                    metadata: error.metadata,
                },
                error.message,
            );
            set.status = error.status;
            return failure(error.message, {
                code: error.code,
                details: error.details,
                ...error.metadata,
            });
        }

        logger.error(
            { error: error instanceof Error ? error.message : String(error) },
            "unexpected backend error",
        );
        set.status = 500;
        return failure("Unexpected backend failure.", {
            code: "GIT_COMMAND_FAILED",
            details: error instanceof Error ? error.message : String(error),
        });
    })
    .get("/health", () => success("Backend is healthy.", [{ ok: true }]))
    .get("/config", async () =>
        success("Configuration loaded.", [await readConfig()]),
    )
    .post("/projects", async ({ body }) => {
        const payload = body as { path?: string };

        if (!payload.path) {
            throw new ApiError("BAD_REQUEST", "Enter a project path.", 400);
        }

        await validateProjectPath(payload.path);
        const project = await addProjectToConfig(payload.path);

        return success("Project added.", [project]);
    })
    .post("/ssh-passphrase", ({ body }) => {
        const payload = body as { passphrase?: string };

        if (!payload.passphrase) {
            throw new ApiError("BAD_REQUEST", "Enter the SSH passphrase.", 400);
        }

        setSshPassphrase(payload.passphrase);
        logger.info("ssh passphrase updated in memory");

        return success("SSH passphrase saved.", [{ ok: true }], {
            action: "ssh_passphrase_saved",
        });
    })
    .post("/ssh-passphrase/clear", () => {
        clearSshPassphrase();
        logger.info("ssh passphrase cleared from memory");

        return success("SSH passphrase cleared.", [{ ok: true }], {
            action: "ssh_passphrase_cleared",
        });
    })
    .get("/projects/:projectId/branches", async ({ params }) => {
        const project = await findProject(params.projectId);
        return success("Branches loaded.", await listBranches(project));
    })
    .post("/projects/:projectId/checkout", async ({ params, body }) => {
        const payload = body as { branch?: string };

        if (!payload.branch) {
            throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
        }

        const project = await findProject(params.projectId);
        const result = await checkoutBranch(project, payload.branch);

        return success(result.message, [result]);
    })
    .post("/projects/:projectId/update", async ({ params, body }) => {
        const payload = body as { branch?: string };

        if (!payload.branch) {
            throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
        }

        const project = await findProject(params.projectId);
        const result = await updateWorktree(project, payload.branch);

        return success(result.message, [result]);
    })
    .delete("/projects/:projectId/worktree", async ({ params, body }) => {
        const payload = body as { branch?: string };

        if (!payload.branch) {
            throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
        }

        const project = await findProject(params.projectId);
        const result = await removeWorktree(project, payload.branch);

        return success(result.message, [result]);
    })
    .post("/projects/:projectId/update-worktrees", async ({ params }) => {
        const project = await findProject(params.projectId);
        const result = await updateProjectWorktrees(project);

        return success(result.message, [result]);
    })
    .get("/projects/:projectId/commits", async ({ params, query }) => {
        const branch = String(query.branch ?? "");

        if (!branch) {
            throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
        }

        const project = await findProject(params.projectId);
        return success(
            "Commit history loaded.",
            await getCommitHistory(project, branch),
        );
    });

const server = app.listen({
    hostname: host,
    port,
});

logger.info({ url: `http://${host}:${server.server?.port}` }, "backend ready");
