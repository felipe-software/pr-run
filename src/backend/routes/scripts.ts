import { Elysia } from "elysia";

import { projectConfigHandler } from "@/backend/handlers/project-config";
import { scriptsHandler } from "@/backend/handlers/scripts";
import { success } from "@/backend/http/response";
import { ApiError } from "@/backend/types";

const router = new Elysia();

router
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
            throw new ApiError("BAD_REQUEST", "Enter the script source.", 400);
        }

        return success("Script saved.", [
            await scriptsHandler.updateScriptSource(
                params.scriptId,
                payload.source,
            ),
        ]);
    })
    .get("/projects/:projectId/package-scripts", async ({ params, query }) => {
        const branch = String(query.branch ?? "");

        if (!branch) {
            throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
        }

        const project = await projectConfigHandler.findProject(
            params.projectId,
        );
        return success("Package scripts loaded.", [
            await scriptsHandler.getPackageScriptCatalog(project, branch),
        ]);
    })
    .post(
        "/projects/:projectId/package-scripts/terminal-command",
        async ({ params, body }) => {
            const payload = body as {
                branch?: string;
                packagePath?: string;
                scriptName?: string;
            };

            if (
                !payload.branch ||
                !payload.packagePath ||
                !payload.scriptName
            ) {
                throw new ApiError(
                    "BAD_REQUEST",
                    "Enter a branch, package path, and script name.",
                    400,
                );
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success("Package script command prepared.", [
                await scriptsHandler.preparePackageScriptTerminalCommand(
                    project,
                    payload.branch,
                    payload.packagePath,
                    payload.scriptName,
                ),
            ]);
        },
    )
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

export default router;
