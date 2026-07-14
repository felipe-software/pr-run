import { Elysia } from "elysia";

import { envFilesHandler } from "@/backend/handlers/env-files";
import { projectConfigHandler } from "@/backend/handlers/project-config";
import { success } from "@/backend/http/response";
import { ApiError } from "@/backend/types";

const router = new Elysia();

router.get("/projects/:projectId/env", async ({ params, query }) => {
    const branch = String(query.branch ?? "");

    if (!branch) {
        throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
    }

    const project = await projectConfigHandler.findProject(params.projectId);
    return success("Env files loaded.", [
        await envFilesHandler.getEnvFilesOverview(project, branch),
    ]);
});

export default router;
