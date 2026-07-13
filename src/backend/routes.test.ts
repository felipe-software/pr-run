import { afterEach, describe, expect, test, vi } from "vitest";

import { dockerHandler } from "@/backend/handlers/docker";
import { envFilesHandler } from "@/backend/handlers/env-files";
import { gitHandler } from "@/backend/handlers/git";
import { projectConfigHandler } from "@/backend/handlers/project-config";
import { scriptsHandler } from "@/backend/handlers/scripts";
import { terminalHandler } from "@/backend/handlers/terminal";
import { createBackendApp } from "@/backend/http/app";
import { getSshPassphrase } from "@/backend/ssh-passphrase";
import { ApiError } from "@/backend/types";

const ORIGIN = "http://localhost:33133";
const project = { id: "project", name: "Project", path: "/tmp/project" };

type RequestOptions = {
    body?: unknown;
    method?: string;
    origin?: string;
};

async function request(path: string, options: RequestOptions = {}) {
    const headers = new Headers({ origin: options.origin ?? ORIGIN });
    let body: string | undefined;

    if (options.body !== undefined) {
        headers.set("content-type", "application/json");
        body = JSON.stringify(options.body);
    }

    return createBackendApp().handle(
        new Request(`http://127.0.0.1:33134${path}`, {
            body,
            headers,
            method: options.method ?? "GET",
        }),
    );
}

async function payload(response: Response) {
    return (await response.json()) as {
        _metadata: Record<string, unknown>;
        data: unknown[];
        message: string;
        type: "error" | "success";
    };
}

function resolved<T extends object, K extends keyof T>(
    object: T,
    key: K,
    value: unknown,
) {
    const spy = vi.spyOn(object, key as never) as unknown as ReturnType<
        typeof vi.fn
    >;
    spy.mockResolvedValue(value);
    return spy;
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("route validation", () => {
    test.each([
        ["terminal cwd", "/terminal/sessions", "POST", {}],
        ["terminal input", "/terminal/sessions/session/input", "POST", {}],
        ["script title", "/scripts", "POST", { title: "  " }],
        ["script source", "/scripts/script/source", "PUT", { source: 42 }],
        ["project path", "/projects", "POST", {}],
        ["checkout branch", "/projects/project/checkout", "POST", {}],
        ["update branch", "/projects/project/update", "POST", {}],
        ["remove branch", "/projects/project/worktree", "DELETE", {}],
        ["commit branch", "/projects/project/commits", "GET", undefined],
        [
            "commit hash",
            "/projects/project/commits/not-a-hash/diff",
            "GET",
            undefined,
        ],
        ["activity branch", "/projects/project/activity", "GET", undefined],
        [
            "activity pull request",
            "/projects/project/activity?branch=main&pullRequestNumber=invalid",
            "GET",
            undefined,
        ],
        [
            "pull request number",
            "/projects/project/pull-requests/0/comments",
            "POST",
            { body: "comment" },
        ],
        [
            "general comment",
            "/projects/project/pull-requests/1/comments",
            "POST",
            { body: " " },
        ],
        [
            "review comment",
            "/projects/project/pull-requests/1/review-comments",
            "POST",
            {
                body: "comment",
                line: 0,
                mode: "immediate",
                path: "src/a.ts",
                side: "RIGHT",
            },
        ],
        [
            "review comment mode",
            "/projects/project/pull-requests/1/review-comments",
            "POST",
            {
                body: "comment",
                line: 1,
                mode: "later",
                path: "src/a.ts",
                side: "RIGHT",
            },
        ],
        [
            "review comment side",
            "/projects/project/pull-requests/1/review-comments",
            "POST",
            {
                body: "comment",
                line: 1,
                mode: "pending",
                path: "src/a.ts",
                side: "MIDDLE",
            },
        ],
        [
            "review outcome",
            "/projects/project/pull-requests/1/reviews/submit",
            "POST",
            { event: "MERGE" },
        ],
        [
            "requested changes body",
            "/projects/project/pull-requests/1/reviews/submit",
            "POST",
            { body: " ", event: "REQUEST_CHANGES" },
        ],
        ["diff branch", "/projects/project/diff", "GET", undefined],
        [
            "file selection",
            "/projects/project/file?branch=main",
            "GET",
            undefined,
        ],
        [
            "package scripts branch",
            "/projects/project/package-scripts",
            "GET",
            undefined,
        ],
        ["docker branch", "/projects/project/docker", "GET", undefined],
        ["env branch", "/projects/project/env", "GET", undefined],
        [
            "docker command branch",
            "/projects/project/docker/terminal-command",
            "POST",
            { action: "up" },
        ],
        [
            "docker command action",
            "/projects/project/docker/terminal-command",
            "POST",
            { action: "build", branch: "main" },
        ],
        [
            "package script command",
            "/projects/project/package-scripts/terminal-command",
            "POST",
            { branch: "main", packagePath: "." },
        ],
        [
            "script terminal branch",
            "/projects/project/scripts/script/terminal-command",
            "POST",
            {},
        ],
        [
            "script stream branch",
            "/projects/project/scripts/script/run/stream",
            "POST",
            {},
        ],
        [
            "script run branch",
            "/projects/project/scripts/script/run",
            "POST",
            {},
        ],
    ] as const)("rejects an invalid %s", async (_name, path, method, body) => {
        const response = await request(path, { body, method });
        const result = await payload(response);

        expect(response.status).toBe(400);
        expect(result).toMatchObject({
            _metadata: { code: "BAD_REQUEST" },
            type: "error",
        });
    });
});

describe("backend app policy and errors", () => {
    test("serves health only to allowed origins", async () => {
        const allowed = await request("/health");
        const rejected = await request("/health", {
            origin: "https://example.com",
        });

        expect(allowed.status).toBe(200);
        expect(await payload(allowed)).toMatchObject({
            data: [{ ok: true }],
            type: "success",
        });
        expect(rejected.status).toBe(403);
        expect(await payload(rejected)).toMatchObject({
            _metadata: { code: "FORBIDDEN_ORIGIN" },
            type: "error",
        });
    });

    test("serializes domain errors from route handlers", async () => {
        resolved(
            projectConfigHandler,
            "readConfig",
            Promise.resolve(),
        ).mockRejectedValue(
            new ApiError(
                "CONFIG_READ_FAILED",
                "Config unavailable",
                503,
                "disk",
                {
                    action: "retry",
                },
            ) as never,
        );

        const response = await request("/config");

        expect(response.status).toBe(503);
        expect(await payload(response)).toMatchObject({
            _metadata: {
                action: "retry",
                code: "CONFIG_READ_FAILED",
                details: "disk",
            },
            message: "Config unavailable",
            type: "error",
        });
    });

    test("sanitizes unexpected handler failures", async () => {
        resolved(
            projectConfigHandler,
            "readConfig",
            Promise.resolve(),
        ).mockRejectedValue(new Error("database details") as never);

        const response = await request("/config");

        expect(response.status).toBe(500);
        expect(await payload(response)).toMatchObject({
            _metadata: {
                code: "GIT_COMMAND_FAILED",
                details: "database details",
            },
            message: "Unexpected backend failure.",
            type: "error",
        });
    });
});

describe("configuration, passphrase, and script routes", () => {
    test("loads configuration and overview scopes", async () => {
        resolved(projectConfigHandler, "readConfig", {
            groups: [
                {
                    collapsed: false,
                    id: "default",
                    name: "Projects",
                    projects: [project],
                },
            ],
        });
        const findProject = resolved(
            projectConfigHandler,
            "findProject",
            project,
        );
        const overview = resolved(gitHandler, "getOverviewSnapshot", {
            projects: [],
            scope: { type: "all" },
            totals: {},
        });

        expect((await request("/config")).status).toBe(200);
        expect((await request("/overview")).status).toBe(200);
        expect((await request("/overview?projectId=project")).status).toBe(200);
        expect(overview.mock.calls[0]?.[1]).toEqual({ type: "all" });
        expect(overview.mock.calls[1]?.[1]).toEqual({
            projectId: "project",
            type: "project",
        });
        expect(findProject).toHaveBeenCalledWith("project");
    });

    test("sets and clears the in-memory SSH passphrase", async () => {
        expect(
            (
                await request("/ssh-passphrase", {
                    body: {},
                    method: "POST",
                })
            ).status,
        ).toBe(400);

        const saved = await request("/ssh-passphrase", {
            body: { passphrase: "secret" },
            method: "POST",
        });
        expect(saved.status).toBe(200);
        expect(getSshPassphrase()).toBe("secret");

        const cleared = await request("/ssh-passphrase/clear", {
            method: "POST",
        });
        expect(cleared.status).toBe(200);
        expect(getSshPassphrase()).toBe("");
    });

    test("delegates script CRUD operations with normalized inputs", async () => {
        const script = {
            button: true,
            fileName: "script.ts",
            filePath: "/tmp/script.ts",
            id: "script",
            lifecycles: [],
            title: "Script",
        };
        const list = resolved(scriptsHandler, "listScripts", [script]);
        const create = resolved(scriptsHandler, "createScript", script);
        const remove = resolved(scriptsHandler, "deleteScript", script);
        const open = resolved(scriptsHandler, "openScript", {
            editor: "vscode",
        });
        const source = resolved(scriptsHandler, "getScriptSource", {
            filePath: script.filePath,
            scriptId: script.id,
            source: "source",
        });
        const update = resolved(scriptsHandler, "updateScriptSource", script);

        for (const [path, options] of [
            ["/scripts", {}],
            ["/scripts", { body: { title: " Script " }, method: "POST" }],
            ["/scripts/script", { method: "DELETE" }],
            ["/scripts/script/open", { method: "POST" }],
            ["/scripts/script/source", {}],
            [
                "/scripts/script/source",
                { body: { source: "updated" }, method: "PUT" },
            ],
        ] as const) {
            expect((await request(path, options)).status).toBe(200);
        }

        expect(list).toHaveBeenCalled();
        expect(create).toHaveBeenCalledWith(" Script ");
        expect(remove).toHaveBeenCalledWith("script");
        expect(open).toHaveBeenCalledWith("script");
        expect(source).toHaveBeenCalledWith("script");
        expect(update).toHaveBeenCalledWith("script", "updated");
    });
});

describe("project domain route delegation", () => {
    test("delegates branch, diff, environment, and command requests", async () => {
        resolved(projectConfigHandler, "findProject", project);
        resolved(gitHandler, "listBranches", []);
        resolved(gitHandler, "getCommitHistory", []);
        resolved(gitHandler, "getBranchDiff", { branch: "feature" });
        resolved(gitHandler, "getBranchFileContent", {
            branch: "feature",
            contents: "content",
            path: "src/a.ts",
        });
        resolved(gitHandler, "getWorktreeActivity", { items: [] });
        resolved(scriptsHandler, "getPackageScriptCatalog", { packages: [] });
        resolved(dockerHandler, "getDockerOverview", { services: [] });
        resolved(envFilesHandler, "getEnvFilesOverview", { files: [] });
        resolved(dockerHandler, "prepareTerminalCommand", {
            action: "logs",
            command: "docker compose logs",
        });
        resolved(scriptsHandler, "preparePackageScriptTerminalCommand", {
            command: "bun run test",
            title: "test",
        });
        resolved(scriptsHandler, "prepareTerminalCommand", {
            command: "bun runner.ts",
        });
        resolved(scriptsHandler, "runScript", { success: false });

        for (const [path, options] of [
            ["/projects/project/branches", {}],
            [
                "/projects/project/commits?branch=feature&baseBranch=main&pullRequestNumber=2",
                {},
            ],
            [
                "/projects/project/activity?branch=feature&baseBranch=main&pullRequestNumber=2",
                {},
            ],
            [
                "/projects/project/diff?branch=feature&baseBranch=main&pullRequestNumber=2",
                {},
            ],
            ["/projects/project/file?branch=feature&path=src%2Fa.ts", {}],
            ["/projects/project/package-scripts?branch=feature", {}],
            ["/projects/project/docker?branch=feature", {}],
            ["/projects/project/env?branch=feature", {}],
            [
                "/projects/project/docker/terminal-command",
                {
                    body: {
                        action: "logs",
                        branch: "feature",
                        service: " web ",
                    },
                    method: "POST",
                },
            ],
            [
                "/projects/project/package-scripts/terminal-command",
                {
                    body: {
                        branch: "feature",
                        packagePath: ".",
                        scriptName: "test",
                    },
                    method: "POST",
                },
            ],
            [
                "/projects/project/scripts/script/terminal-command",
                { body: { branch: "feature" }, method: "POST" },
            ],
            [
                "/projects/project/scripts/script/run",
                { body: { branch: "feature" }, method: "POST" },
            ],
        ] as const) {
            expect((await request(path, options)).status).toBe(200);
        }

        expect(dockerHandler.prepareTerminalCommand).toHaveBeenCalledWith(
            project,
            "feature",
            "logs",
            "web",
        );
        expect(scriptsHandler.runScript).toHaveBeenCalledWith(
            project,
            "feature",
            "script",
        );
    });
});

describe("terminal routes", () => {
    test("delegates the complete terminal session lifecycle", async () => {
        resolved(terminalHandler, "createSession", { id: "session" });
        resolved(terminalHandler, "getSessionSnapshot", { id: "session" });
        resolved(terminalHandler, "getSessionState", { id: "session" });
        const input = resolved(terminalHandler, "writeInput", undefined);
        const resize = resolved(terminalHandler, "resizeSession", undefined);
        const dispose = resolved(terminalHandler, "disposeSession", undefined);

        expect(
            (
                await request("/terminal/sessions", {
                    body: { cols: 100, cwd: "/tmp/project", rows: 40 },
                    method: "POST",
                })
            ).status,
        ).toBe(200);
        expect((await request("/terminal/sessions/session")).status).toBe(200);
        expect((await request("/terminal/sessions/session/state")).status).toBe(
            200,
        );
        expect(
            (
                await request("/terminal/sessions/session/input", {
                    body: { data: "ls\n", options: { source: "keyboard" } },
                    method: "POST",
                })
            ).status,
        ).toBe(200);
        expect(
            (
                await request("/terminal/sessions/session/resize", {
                    body: {},
                    method: "POST",
                })
            ).status,
        ).toBe(200);
        expect(
            (
                await request("/terminal/sessions/session", {
                    method: "DELETE",
                })
            ).status,
        ).toBe(200);

        expect(input).toHaveBeenCalledWith("session", "ls\n", {
            source: "keyboard",
        });
        expect(resize).toHaveBeenCalledWith("session", 80, 24);
        expect(dispose).toHaveBeenCalledWith("session");
    });
});
