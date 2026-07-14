import { Elysia } from "elysia";

import { dockerHandler } from "@/backend/handlers/docker";
import { projectConfigHandler } from "@/backend/handlers/project-config";
import { success } from "@/backend/http/response";
import { ApiError } from "@/backend/types";

const router = new Elysia();

router
    .get("/projects/:projectId/docker", async ({ params, query }) => {
        const branch = String(query.branch ?? "");

        if (!branch) {
            throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
        }

        const project = await projectConfigHandler.findProject(
            params.projectId,
        );
        return success("Docker overview loaded.", [
            await dockerHandler.getDockerOverview(project, branch),
        ]);
    })
    .post(
        "/projects/:projectId/docker/terminal-command",
        async ({ body, params }) => {
            const payload = body as {
                action?: string;
                branch?: string;
                service?: string;
            };

            if (!payload.branch) {
                throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
            }

            if (
                payload.action !== "down" &&
                payload.action !== "logs" &&
                payload.action !== "restart" &&
                payload.action !== "up"
            ) {
                throw new ApiError(
                    "BAD_REQUEST",
                    "Enter a valid Docker action.",
                    400,
                );
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success("Docker command prepared.", [
                await dockerHandler.prepareTerminalCommand(
                    project,
                    payload.branch,
                    payload.action,
                    payload.service?.trim() || undefined,
                ),
            ]);
        },
    );

export default router;
