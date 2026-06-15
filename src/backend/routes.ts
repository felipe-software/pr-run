import type { Elysia } from "elysia";

import { gitHandler } from "@/backend/handlers/git";
import { projectConfigHandler } from "@/backend/handlers/project-config";
import { scriptsHandler } from "@/backend/handlers/scripts";
import { success } from "@/backend/http/response";
import { logger } from "@/backend/logger";
import { clearSshPassphrase, setSshPassphrase } from "@/backend/ssh-passphrase";
import { ApiError } from "@/backend/types";

export function registerRoutes(app: Elysia) {
    return app
        .get("/health", () => success("Backend is healthy.", [{ ok: true }]))
        .get("/config", async () =>
            success("Configuration loaded.", [
                await projectConfigHandler.readConfig(),
            ]),
        )
        .get("/scripts", async () =>
            success("Scripts loaded.", await scriptsHandler.listScripts()),
        )
        .post("/scripts", async ({ body }) => {
            const payload = body as { title?: string };

            if (!payload.title?.trim()) {
                throw new ApiError("BAD_REQUEST", "Enter a script title.", 400);
            }

            return success("Script created.", [
                await scriptsHandler.createScript(payload.title),
            ]);
        })
        .delete("/scripts/:scriptId", async ({ params }) =>
            success("Script deleted.", [
                await scriptsHandler.deleteScript(params.scriptId),
            ]),
        )
        .post("/scripts/:scriptId/open", async ({ params }) =>
            success("Script opened.", [
                await scriptsHandler.openScript(params.scriptId),
            ]),
        )
        .get("/scripts/:scriptId/source", async ({ params }) =>
            success("Script source loaded.", [
                await scriptsHandler.getScriptSource(params.scriptId),
            ]),
        )
        .put("/scripts/:scriptId/source", async ({ params, body }) => {
            const payload = body as { source?: string };

            if (typeof payload.source !== "string") {
                throw new ApiError(
                    "BAD_REQUEST",
                    "Enter the script source.",
                    400,
                );
            }

            return success("Script saved.", [
                await scriptsHandler.updateScriptSource(
                    params.scriptId,
                    payload.source,
                ),
            ]);
        })
        .post("/projects", async ({ body }) => {
            const payload = body as { path?: string };

            if (!payload.path) {
                throw new ApiError("BAD_REQUEST", "Enter a project path.", 400);
            }

            await gitHandler.validateProjectPath(payload.path);
            const project = await projectConfigHandler.addProject(payload.path);

            return success("Project added.", [project]);
        })
        .post("/ssh-passphrase", ({ body }) => {
            const payload = body as { passphrase?: string };

            if (!payload.passphrase) {
                throw new ApiError(
                    "BAD_REQUEST",
                    "Enter the SSH passphrase.",
                    400,
                );
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
            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success(
                "Branches loaded.",
                await gitHandler.listBranches(project),
            );
        })
        .post("/projects/:projectId/checkout", async ({ params, body }) => {
            const payload = body as { branch?: string };

            if (!payload.branch) {
                throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            const result = await gitHandler.checkoutBranch(
                project,
                payload.branch,
            );

            return success(result.message, [result]);
        })
        .post("/projects/:projectId/update", async ({ params, body }) => {
            const payload = body as { branch?: string };

            if (!payload.branch) {
                throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            const result = await gitHandler.updateWorktree(
                project,
                payload.branch,
            );

            return success(result.message, [result]);
        })
        .delete("/projects/:projectId/worktree", async ({ params, body }) => {
            const payload = body as { branch?: string };

            if (!payload.branch) {
                throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            const result = await gitHandler.removeWorktree(
                project,
                payload.branch,
            );

            return success(result.message, [result]);
        })
        .post("/projects/:projectId/update-worktrees", async ({ params }) => {
            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            const result = await gitHandler.updateProjectWorktrees(project);

            return success(result.message, [result]);
        })
        .get("/projects/:projectId/commits", async ({ params, query }) => {
            const branch = String(query.branch ?? "");
            const baseBranch = query.baseBranch
                ? String(query.baseBranch)
                : undefined;

            if (!branch) {
                throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success(
                "Commit history loaded.",
                await gitHandler.getCommitHistory(project, branch, baseBranch),
            );
        })
        .get("/projects/:projectId/diff", async ({ params, query }) => {
            const branch = String(query.branch ?? "");
            const baseBranch = query.baseBranch
                ? String(query.baseBranch)
                : undefined;

            if (!branch) {
                throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success("Branch diff loaded.", [
                await gitHandler.getBranchDiff(project, branch, baseBranch),
            ]);
        })
        .post(
            "/projects/:projectId/scripts/:scriptId/terminal-command",
            async ({ params, body }) => {
                const payload = body as { branch?: string };

                if (!payload.branch) {
                    throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
                }

                const project = await projectConfigHandler.findProject(
                    params.projectId,
                );
                return success("Script command prepared.", [
                    await scriptsHandler.prepareTerminalCommand(
                        project,
                        payload.branch,
                        params.scriptId,
                    ),
                ]);
            },
        )
        .post(
            "/projects/:projectId/scripts/:scriptId/run/stream",
            async ({ params, body }) => {
                const payload = body as { branch?: string };

                if (!payload.branch) {
                    throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
                }

                const project = await projectConfigHandler.findProject(
                    params.projectId,
                );
                return await scriptsHandler.streamScript(
                    project,
                    payload.branch,
                    params.scriptId,
                );
            },
        )
        .post(
            "/projects/:projectId/scripts/:scriptId/run",
            async ({ params, body }) => {
                const payload = body as { branch?: string };

                if (!payload.branch) {
                    throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
                }

                const project = await projectConfigHandler.findProject(
                    params.projectId,
                );
                const result = await scriptsHandler.runScript(
                    project,
                    payload.branch,
                    params.scriptId,
                );

                return success(
                    result.success
                        ? "Script completed."
                        : "Script reported a failure.",
                    [result],
                );
            },
        );
}
