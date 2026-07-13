import { afterEach, describe, expect, test, vi } from "vitest";

import { environmentApi } from "@/lib/api/environment";
import { gitApi } from "@/lib/api/git";
import { prRunApi } from "@/lib/api";
import { projectApi, projectPath } from "@/lib/api/projects";
import { reviewApi } from "@/lib/api/reviews";
import { scriptApi } from "@/lib/api/scripts";
import { terminalApi } from "@/lib/api/terminal";
import * as transport from "@/lib/api/transport";

afterEach(() => {
    vi.restoreAllMocks();
});

function mockRequests() {
    const one = vi
        .spyOn(transport, "requestOne")
        .mockResolvedValue({} as never);
    const many = vi
        .spyOn(transport, "requestMany")
        .mockResolvedValue([] as never);
    return { many, one };
}

describe("project API contracts", () => {
    test("encodes project paths and project mutations", () => {
        const { many, one } = mockRequests();

        expect(projectPath("project / one")).toBe(
            "/projects/project%20%2F%20one",
        );
        expect(projectPath("project", "/branches")).toBe(
            "/projects/project/branches",
        );

        projectApi.addProject("/tmp/project");
        projectApi.checkoutBranch("project / one", "feature/a");
        projectApi.getConfig();
        projectApi.listBranches("project / one");
        projectApi.removeWorktree("project", "feature/a");
        projectApi.updateProjectWorktrees("project");
        projectApi.updateWorktree("project", "feature/a");

        expect(one.mock.calls).toEqual([
            ["/projects", { json: { path: "/tmp/project" }, method: "POST" }],
            [
                "/projects/project%20%2F%20one/checkout",
                { json: { branch: "feature/a" }, method: "POST" },
            ],
            ["/config"],
            [
                "/projects/project/worktree",
                { json: { branch: "feature/a" }, method: "DELETE" },
            ],
            ["/projects/project/update-worktrees", { method: "POST" }],
            [
                "/projects/project/update",
                { json: { branch: "feature/a" }, method: "POST" },
            ],
        ]);
        expect(many).toHaveBeenCalledWith(
            "/projects/project%20%2F%20one/branches",
        );
    });
});

describe("environment and Git API contracts", () => {
    test("encodes branch environment reads and command payloads", () => {
        const { one } = mockRequests();

        environmentApi.getDockerOverview("project / one", "feature/a & b");
        environmentApi.getEnvFiles("project", "feature/a");
        environmentApi.getPackageScripts("project", "feature/a");
        environmentApi.prepareDockerTerminalCommand(
            "project",
            "feature/a",
            "logs",
            "web api",
        );
        environmentApi.preparePackageScriptTerminalCommand(
            "project",
            "feature/a",
            "packages/app",
            "test:watch",
        );

        expect(one.mock.calls[0]?.[0]).toBe(
            "/projects/project%20%2F%20one/docker?branch=feature%2Fa+%26+b",
        );
        expect(one.mock.calls.slice(1)).toEqual([
            ["/projects/project/env?branch=feature%2Fa"],
            ["/projects/project/package-scripts?branch=feature%2Fa"],
            [
                "/projects/project/docker/terminal-command",
                {
                    json: {
                        action: "logs",
                        branch: "feature/a",
                        service: "web api",
                    },
                    method: "POST",
                },
            ],
            [
                "/projects/project/package-scripts/terminal-command",
                {
                    json: {
                        branch: "feature/a",
                        packagePath: "packages/app",
                        scriptName: "test:watch",
                    },
                    method: "POST",
                },
            ],
        ]);
    });

    test("builds branch, file, commit, and pull-request Git queries", () => {
        const { many, one } = mockRequests();

        gitApi.getBranchDiff("project", "feature/a", "main", 42);
        gitApi.getBranchFile("project", "feature/a", "src/a b.ts");
        gitApi.getCommitDiff("project", "abc/123");
        gitApi.getCommitHistory("project", "feature/a");
        gitApi.getWorktreeActivity("project", "feature/a", undefined, 7);

        expect(one.mock.calls).toEqual([
            [
                "/projects/project/diff?branch=feature%2Fa&baseBranch=main&pullRequestNumber=42",
            ],
            ["/projects/project/file?branch=feature%2Fa&path=src%2Fa+b.ts"],
            ["/projects/project/commits/abc%2F123/diff"],
            [
                "/projects/project/activity?branch=feature%2Fa&pullRequestNumber=7",
            ],
        ]);
        expect(many).toHaveBeenCalledWith(
            "/projects/project/commits?branch=feature%2Fa",
        );
    });
});

describe("review API contracts", () => {
    test("builds each review mutation", () => {
        const { one } = mockRequests();
        const lineComment = {
            body: "Please change this",
            line: 12,
            mode: "pending" as const,
            path: "src/a.ts",
            side: "RIGHT" as const,
            startLine: 10,
            startSide: "RIGHT" as const,
        };

        reviewApi.addPullRequestComment("project", 42, "Looks good");
        reviewApi.addPullRequestReviewComment("project", 42, lineComment);
        reviewApi.discardPendingPullRequestReview("project", 42);
        reviewApi.submitPullRequestReview(
            "project",
            42,
            "REQUEST_CHANGES",
            "Please update",
        );

        expect(one.mock.calls).toEqual([
            [
                "/projects/project/pull-requests/42/comments",
                { json: { body: "Looks good" }, method: "POST" },
            ],
            [
                "/projects/project/pull-requests/42/review-comments",
                { json: lineComment, method: "POST" },
            ],
            [
                "/projects/project/pull-requests/42/reviews/pending",
                { method: "DELETE" },
            ],
            [
                "/projects/project/pull-requests/42/reviews/submit",
                {
                    json: {
                        body: "Please update",
                        event: "REQUEST_CHANGES",
                    },
                    method: "POST",
                },
            ],
        ]);
    });
});

describe("script and terminal API contracts", () => {
    test("builds script CRUD and execution requests", () => {
        const { many, one } = mockRequests();

        scriptApi.createScript("Deploy");
        scriptApi.deleteScript("script / one");
        scriptApi.getScriptSource("script / one");
        scriptApi.listScripts();
        scriptApi.openScript("script / one");
        scriptApi.prepareScriptTerminalCommand(
            "project / one",
            "feature/a",
            "script / one",
        );
        scriptApi.runScript("project", "feature/a", "script / one");
        scriptApi.updateScriptSource("script / one", "source");

        expect(one.mock.calls).toEqual([
            ["/scripts", { json: { title: "Deploy" }, method: "POST" }],
            ["/scripts/script%20%2F%20one", { method: "DELETE" }],
            ["/scripts/script%20%2F%20one/source"],
            ["/scripts/script%20%2F%20one/open", { method: "POST" }],
            [
                "/projects/project%20%2F%20one/scripts/script%20%2F%20one/terminal-command",
                { json: { branch: "feature/a" }, method: "POST" },
            ],
            [
                "/projects/project/scripts/script%20%2F%20one/run",
                { json: { branch: "feature/a" }, method: "POST" },
            ],
            [
                "/scripts/script%20%2F%20one/source",
                { json: { source: "source" }, method: "PUT" },
            ],
        ]);
        expect(many).toHaveBeenCalledWith("/scripts");
    });

    test("builds terminal session requests", () => {
        const { one } = mockRequests();
        const options = { cols: 90, cwd: "/tmp/project", rows: 30 };

        terminalApi.createTerminalSession(options);
        terminalApi.disposeTerminalSession("session / one");
        terminalApi.getTerminalSessionSnapshot("session / one");
        terminalApi.getTerminalSessionState("session / one");
        terminalApi.resizeTerminal("session / one", 100, 40);
        terminalApi.writeTerminalInput("session / one", "ls\n", {
            source: "keyboard",
        });

        expect(one.mock.calls).toEqual([
            ["/terminal/sessions", { json: options, method: "POST" }],
            ["/terminal/sessions/session%20%2F%20one", { method: "DELETE" }],
            ["/terminal/sessions/session%20%2F%20one"],
            ["/terminal/sessions/session%20%2F%20one/state"],
            [
                "/terminal/sessions/session%20%2F%20one/resize",
                { json: { cols: 100, rows: 40 }, method: "POST" },
            ],
            [
                "/terminal/sessions/session%20%2F%20one/input",
                {
                    json: { data: "ls\n", options: { source: "keyboard" } },
                    method: "POST",
                },
            ],
        ]);
    });
});

describe("combined API", () => {
    test("requests global and project overviews", () => {
        const { one } = mockRequests();

        prRunApi.getOverview();
        prRunApi.getOverview("project / one");

        expect(one.mock.calls).toEqual([
            ["/overview"],
            ["/overview?projectId=project+%2F+one"],
        ]);
    });
});
