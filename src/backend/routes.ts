import type { Elysia } from "elysia";

import { envFilesHandler } from "@/backend/handlers/env-files";
import { dockerHandler } from "@/backend/handlers/docker";
import { gitHandler } from "@/backend/handlers/git";
import { projectConfigHandler } from "@/backend/handlers/project-config";
import { scriptsHandler } from "@/backend/handlers/scripts";
import { terminalHandler } from "@/backend/handlers/terminal";
import { success } from "@/backend/http/response";
import { logger } from "@/backend/logger";
import { clearSshPassphrase, setSshPassphrase } from "@/backend/ssh-passphrase";
import { ApiError } from "@/backend/types";

export function registerRoutes(app: Elysia) {
    return app
        .get("/health", () => success("Backend is healthy.", [{ ok: true }]))
        .post("/terminal/sessions", async ({ body }) => {
            const payload = body as {
                cols?: number;
                cwd?: string;
                rows?: number;
            };

            if (!payload.cwd) {
                throw new ApiError("BAD_REQUEST", "Enter a terminal cwd.", 400);
            }

            return success("Terminal session created.", [
                await terminalHandler.createSession({
                    cols: Number(payload.cols ?? 80),
                    cwd: payload.cwd,
                    rows: Number(payload.rows ?? 24),
                }),
            ]);
        })
        .get("/terminal/sessions/:sessionId", async ({ params }) =>
            success("Terminal session loaded.", [
                await terminalHandler.getSessionSnapshot(params.sessionId),
            ]),
        )
        .get("/terminal/sessions/:sessionId/state", async ({ params }) =>
            success("Terminal session state loaded.", [
                await terminalHandler.getSessionState(params.sessionId),
            ]),
        )
        .get("/terminal/sessions/:sessionId/events", ({ params }) =>
            terminalHandler.createEventStream(params.sessionId),
        )
        .post("/terminal/sessions/:sessionId/input", ({ body, params }) => {
            const payload = body as {
                data?: string;
                options?: { source?: "keyboard" | "script" };
            };

            if (typeof payload.data !== "string") {
                throw new ApiError("BAD_REQUEST", "Enter terminal input.", 400);
            }

            terminalHandler.writeInput(
                params.sessionId,
                payload.data,
                payload.options,
            );

            return success("Terminal input written.", [{ ok: true }]);
        })
        .post("/terminal/sessions/:sessionId/resize", ({ body, params }) => {
            const payload = body as { cols?: number; rows?: number };

            terminalHandler.resizeSession(
                params.sessionId,
                Number(payload.cols ?? 80),
                Number(payload.rows ?? 24),
            );

            return success("Terminal resized.", [{ ok: true }]);
        })
        .delete("/terminal/sessions/:sessionId", ({ params }) => {
            terminalHandler.disposeSession(params.sessionId);

            return success("Terminal session disposed.", [{ ok: true }]);
        })
        .get("/config", async () =>
            success("Configuration loaded.", [
                await projectConfigHandler.readConfig(),
            ]),
        )
        .get("/overview", async ({ query }) => {
            const projectId = query.projectId
                ? String(query.projectId)
                : undefined;
            const config = await projectConfigHandler.readConfig();
            const projects = config.groups.flatMap((group) => group.projects);
            const selectedProjects = projectId
                ? [await projectConfigHandler.findProject(projectId)]
                : projects;

            return success("Overview loaded.", [
                await gitHandler.getOverviewSnapshot(
                    selectedProjects,
                    projectId
                        ? { projectId, type: "project" }
                        : { type: "all" },
                ),
            ]);
        })
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
        .post(
            "/projects/:projectId/pull-requests/:pullRequestNumber/comments",
            async ({ params, body }) => {
                const payload = body as { body?: string };
                const pullRequestNumber = parsePullRequestNumber(
                    params.pullRequestNumber,
                );

                if (!payload.body?.trim()) {
                    throw new ApiError("BAD_REQUEST", "Enter a comment.", 400);
                }

                const project = await projectConfigHandler.findProject(
                    params.projectId,
                );
                return success("Comment added.", [
                    await gitHandler.addGeneralComment(
                        project,
                        pullRequestNumber,
                        payload.body.trim(),
                    ),
                ]);
            },
        )
        .post(
            "/projects/:projectId/pull-requests/:pullRequestNumber/review-comments",
            async ({ params, body }) => {
                const payload = body as {
                    body?: string;
                    line?: number;
                    mode?: string;
                    path?: string;
                    side?: string;
                    startLine?: number;
                    startSide?: string;
                };
                const pullRequestNumber = parsePullRequestNumber(
                    params.pullRequestNumber,
                );

                if (
                    !payload.body?.trim() ||
                    !payload.path?.trim() ||
                    !Number.isSafeInteger(payload.line) ||
                    Number(payload.line) < 1 ||
                    (payload.mode !== "immediate" &&
                        payload.mode !== "pending") ||
                    (payload.side !== "LEFT" && payload.side !== "RIGHT") ||
                    (payload.startSide !== undefined &&
                        payload.startSide !== "LEFT" &&
                        payload.startSide !== "RIGHT")
                ) {
                    throw new ApiError(
                        "BAD_REQUEST",
                        "Enter a valid review comment and line range.",
                        400,
                    );
                }

                const project = await projectConfigHandler.findProject(
                    params.projectId,
                );
                return success("Review comment added.", [
                    await gitHandler.addReviewComment(
                        project,
                        pullRequestNumber,
                        {
                            body: payload.body.trim(),
                            line: Number(payload.line),
                            mode: payload.mode,
                            path: payload.path.trim(),
                            side: payload.side,
                            startLine: payload.startLine,
                            startSide: payload.startSide,
                        },
                    ),
                ]);
            },
        )
        .post(
            "/projects/:projectId/pull-requests/:pullRequestNumber/reviews/submit",
            async ({ params, body }) => {
                const payload = body as { body?: string; event?: string };
                const pullRequestNumber = parsePullRequestNumber(
                    params.pullRequestNumber,
                );

                if (
                    payload.event !== "APPROVE" &&
                    payload.event !== "COMMENT" &&
                    payload.event !== "REQUEST_CHANGES"
                ) {
                    throw new ApiError(
                        "BAD_REQUEST",
                        "Enter a valid review outcome.",
                        400,
                    );
                }

                if (
                    payload.event === "REQUEST_CHANGES" &&
                    !payload.body?.trim()
                ) {
                    throw new ApiError(
                        "BAD_REQUEST",
                        "Explain the requested changes.",
                        400,
                    );
                }

                const project = await projectConfigHandler.findProject(
                    params.projectId,
                );
                return success("Review submitted.", [
                    await gitHandler.submitReview(
                        project,
                        pullRequestNumber,
                        payload.event,
                        payload.body,
                    ),
                ]);
            },
        )
        .delete(
            "/projects/:projectId/pull-requests/:pullRequestNumber/reviews/pending",
            async ({ params }) => {
                const project = await projectConfigHandler.findProject(
                    params.projectId,
                );
                return success("Pending review discarded.", [
                    await gitHandler.discardPendingReview(
                        project,
                        parsePullRequestNumber(params.pullRequestNumber),
                    ),
                ]);
            },
        )
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
        .get(
            "/projects/:projectId/package-scripts",
            async ({ params, query }) => {
                const branch = String(query.branch ?? "");

                if (!branch) {
                    throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
                }

                const project = await projectConfigHandler.findProject(
                    params.projectId,
                );
                return success("Package scripts loaded.", [
                    await scriptsHandler.getPackageScriptCatalog(
                        project,
                        branch,
                    ),
                ]);
            },
        )
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
        .get("/projects/:projectId/env", async ({ params, query }) => {
            const branch = String(query.branch ?? "");

            if (!branch) {
                throw new ApiError("BAD_REQUEST", "Enter a branch.", 400);
            }

            const project = await projectConfigHandler.findProject(
                params.projectId,
            );
            return success("Env files loaded.", [
                await envFilesHandler.getEnvFilesOverview(project, branch),
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
        )
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
}

function parsePullRequestNumber(value: string) {
    const number = Number(value);

    if (!Number.isSafeInteger(number) || number < 1) {
        throw new ApiError(
            "BAD_REQUEST",
            "Enter a valid pull request number.",
            400,
        );
    }

    return number;
}
