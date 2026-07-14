import { Elysia } from "elysia";

import { gitHandler } from "@/backend/handlers/git";
import { projectConfigHandler } from "@/backend/handlers/project-config";
import { success } from "@/backend/http/response";
import { ApiError } from "@/backend/types";

const router = new Elysia();

router
    .get("/config", async () =>
        success("Configuration loaded.", [
            await projectConfigHandler.readConfig(),
        ]),
    )
    .get("/overview", async ({ query }) => {
        const projectId = query.projectId ? String(query.projectId) : undefined;
        const config = await projectConfigHandler.readConfig();
        const projects = config.groups.flatMap((group) => group.projects);
        const selectedProjects = projectId
            ? [await projectConfigHandler.findProject(projectId)]
            : projects;

        return success("Overview loaded.", [
            await gitHandler.getOverviewSnapshot(
                selectedProjects,
                projectId ? { projectId, type: "project" } : { type: "all" },
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
        const result = await gitHandler.checkoutBranch(project, payload.branch);

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
        const result = await gitHandler.updateWorktree(project, payload.branch);

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
        const result = await gitHandler.removeWorktree(project, payload.branch);

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
        const pullRequestNumber = query.pullRequestNumber
            ? Number(query.pullRequestNumber)
            : undefined;

        if (!branch) {
            throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
        }

        const project = await projectConfigHandler.findProject(
            params.projectId,
        );
        return success(
            "Commit history loaded.",
            await gitHandler.getCommitHistory(
                project,
                branch,
                baseBranch,
                pullRequestNumber,
            ),
        );
    })
    .get("/projects/:projectId/commits/:hash/diff", async ({ params }) => {
        const hash = String(params.hash ?? "");

        if (!/^[0-9a-f]{7,64}$/i.test(hash)) {
            throw new ApiError(
                "BAD_REQUEST",
                "Enter a valid commit hash.",
                400,
            );
        }

        const project = await projectConfigHandler.findProject(
            params.projectId,
        );
        return success("Commit diff loaded.", [
            await gitHandler.getCommitDiff(project, hash),
        ]);
    })
    .get("/projects/:projectId/activity", async ({ params, query }) => {
        const branch = String(query.branch ?? "");
        const baseBranch = query.baseBranch
            ? String(query.baseBranch)
            : undefined;
        const pullRequestNumber = query.pullRequestNumber
            ? Number(query.pullRequestNumber)
            : undefined;

        if (!branch) {
            throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
        }

        if (
            pullRequestNumber !== undefined &&
            !Number.isSafeInteger(pullRequestNumber)
        ) {
            throw new ApiError(
                "BAD_REQUEST",
                "Enter a valid pull request number.",
                400,
            );
        }

        const project = await projectConfigHandler.findProject(
            params.projectId,
        );
        return success("Worktree activity loaded.", [
            await gitHandler.getWorktreeActivity(
                project,
                branch,
                baseBranch,
                pullRequestNumber,
            ),
        ]);
    })
    .get("/projects/:projectId/diff", async ({ params, query }) => {
        const branch = String(query.branch ?? "");
        const baseBranch = query.baseBranch
            ? String(query.baseBranch)
            : undefined;
        const pullRequestNumber = query.pullRequestNumber
            ? Number(query.pullRequestNumber)
            : undefined;

        if (!branch) {
            throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
        }

        const project = await projectConfigHandler.findProject(
            params.projectId,
        );
        return success("Branch diff loaded.", [
            await gitHandler.getBranchDiff(
                project,
                branch,
                baseBranch,
                pullRequestNumber,
            ),
        ]);
    })
    .get("/projects/:projectId/file", async ({ params, query }) => {
        const branch = String(query.branch ?? "");
        const path = String(query.path ?? "");

        if (!branch || !path) {
            throw new ApiError("BAD_REQUEST", "Choose a branch and file.", 400);
        }

        const project = await projectConfigHandler.findProject(
            params.projectId,
        );
        return success("Branch file loaded.", [
            await gitHandler.getBranchFileContent(project, branch, path),
        ]);
    });

export default router;
