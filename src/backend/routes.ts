import type { Elysia } from "elysia";

import { gitHandler } from "@/backend/handlers/git";
import { projectConfigHandler } from "@/backend/handlers/project-config";
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

            if (!branch) {
                throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success(
                "Commit history loaded.",
                await gitHandler.getCommitHistory(project, branch),
            );
        })
        .get("/projects/:projectId/diff", async ({ params, query }) => {
            const branch = String(query.branch ?? "");

            if (!branch) {
                throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success("Branch diff loaded.", [
                await gitHandler.getBranchDiff(project, branch),
            ]);
        });
}
