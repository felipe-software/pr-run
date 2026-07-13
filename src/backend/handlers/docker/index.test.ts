import { execFile } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
    getDockerOverview,
    normalizeDockerServiceState,
    parseComposePsOutput,
    prepareTerminalCommand,
} from "./index";

const execFileAsync = promisify(execFile);
const fixtureDirectories: string[] = [];
const originalPath = process.env.PATH;

afterEach(async () => {
    process.env.PATH = originalPath;
    await Promise.all(
        fixtureDirectories
            .splice(0)
            .map((directory) =>
                rm(directory, { force: true, recursive: true }),
            ),
    );
});

async function createDockerWorktree() {
    const directory = await mkdtemp(path.join(os.tmpdir(), "pr-run-docker-"));
    fixtureDirectories.push(directory);
    const projectPath = path.join(directory, "project");
    const worktreePath = path.join(directory, "feature-worktree");
    const binPath = path.join(directory, "bin");
    await Promise.all([mkdir(projectPath), mkdir(binPath)]);
    await execFileAsync("git", ["init", "-b", "main", projectPath]);
    const git = (...args: string[]) =>
        execFileAsync("git", args, { cwd: projectPath });
    await git("config", "user.email", "tests@example.com");
    await git("config", "user.name", "PR Run Tests");
    await writeFile(path.join(projectPath, "README.md"), "root\n");
    await git("add", "README.md");
    await git("commit", "-m", "initial");
    await git("branch", "feature");
    await git("worktree", "add", worktreePath, "feature");

    return {
        binPath,
        project: { id: "project", name: "Project", path: projectPath },
        worktreePath,
    };
}

async function installFakeDocker(binPath: string) {
    const executable = path.join(binPath, "docker");
    await writeFile(
        executable,
        `#!/usr/bin/env bun
const args = Bun.argv.slice(2);
if (args.includes("version")) process.exit(0);
if (args.includes("config") && args.includes("--services")) {
    console.log("worker\\nweb\\napi");
    process.exit(0);
}
if (args.includes("ps")) {
    console.log(JSON.stringify([
        { Service: "web", Name: "web-1", State: "running", Status: "Up", Health: "healthy" },
        { Service: "web", Name: "web-2", State: "exited", Status: "Exited", Health: "unhealthy" },
        { Service: "worker", Name: "worker-1", State: "paused", Status: "Paused" }
    ]));
    process.exit(0);
}
console.error("unexpected docker arguments: " + args.join(" "));
process.exit(2);
`,
    );
    await chmod(executable, 0o755);
    process.env.PATH = `${binPath}${path.delimiter}${originalPath ?? ""}`;
}

describe("normalizeDockerServiceState", () => {
    it("maps empty states to not-created", () => {
        expect(normalizeDockerServiceState(undefined)).toBe("not-created");
        expect(normalizeDockerServiceState("")).toBe("not-created");
    });

    it("normalizes known docker compose states", () => {
        for (const state of [
            "created",
            "dead",
            "exited",
            "paused",
            "restarting",
            "running",
        ] as const) {
            expect(
                normalizeDockerServiceState(` ${state.toUpperCase()} `),
            ).toBe(state);
        }
    });

    it("falls back to unknown for unsupported states", () => {
        expect(normalizeDockerServiceState("removing")).toBe("unknown");
    });
});

describe("parseComposePsOutput", () => {
    it("parses json arrays", async () => {
        const result = await parseComposePsOutput(`[
  {
    "Service": "api",
    "Name": "pr-run-api-1",
    "State": "running",
    "Status": "Up 3 minutes",
    "Health": "healthy"
  }
]`);

        expect(result).toEqual([
            {
                containerName: "pr-run-api-1",
                health: "healthy",
                service: "api",
                state: "running",
                statusText: "Up 3 minutes",
            },
        ]);
    });

    it("parses newline-delimited json payloads", async () => {
        const result = await parseComposePsOutput(
            [
                '{"Service":"web","Name":"pr-run-web-1","State":"running","Status":"Up 10 seconds"}',
                '{"Service":"worker","Name":"pr-run-worker-1","State":"exited","Status":"Exited (1) 2 seconds ago"}',
            ].join("\n"),
        );

        expect(result).toEqual([
            {
                containerName: "pr-run-web-1",
                health: undefined,
                service: "web",
                state: "running",
                statusText: "Up 10 seconds",
            },
            {
                containerName: "pr-run-worker-1",
                health: undefined,
                service: "worker",
                state: "exited",
                statusText: "Exited (1) 2 seconds ago",
            },
        ]);
    });

    it("handles empty, lowercase, single-object, and invalid records", async () => {
        expect(await parseComposePsOutput(" \n ")).toEqual([]);
        expect(
            await parseComposePsOutput(
                JSON.stringify({
                    health: " healthy ",
                    name: " app-1 ",
                    service: " app ",
                    state: "RUNNING",
                    status: " Up ",
                }),
            ),
        ).toEqual([
            {
                containerName: "app-1",
                health: "healthy",
                service: "app",
                state: "running",
                statusText: "Up",
            },
        ]);
        expect(
            await parseComposePsOutput(
                '[null,42,{"State":"running"},{"Service":"valid","State":"created"}]',
            ),
        ).toEqual([
            {
                containerName: undefined,
                health: undefined,
                service: "valid",
                state: "created",
                statusText: undefined,
            },
        ]);
        expect(await parseComposePsOutput("invalid\n[]\n{}\n")).toEqual([]);
    });
});

describe("Docker Compose integration", () => {
    it("discovers Compose, summarizes replicas, and prepares every action", async () => {
        const { binPath, project, worktreePath } = await createDockerWorktree();
        await installFakeDocker(binPath);
        await mkdir(path.join(worktreePath, "services"));
        await writeFile(
            path.join(worktreePath, "services", "compose.yaml"),
            "services: {}\n",
        );

        const overview = await getDockerOverview(project, "feature");

        expect(overview).toMatchObject({
            branch: "feature",
            composeCli: "docker compose",
            composeFilePath: "services/compose.yaml",
            worktreePath,
        });
        expect(overview.services).toEqual([
            {
                isRunning: false,
                name: "api",
                state: "not-created",
                statusText: "Not created",
            },
            {
                containerName: undefined,
                health: "healthy, unhealthy",
                isRunning: true,
                name: "web",
                state: "running",
                statusText: "1/2 containers running",
            },
            {
                containerName: "worker-1",
                health: undefined,
                isRunning: false,
                name: "worker",
                state: "paused",
                statusText: "Paused",
            },
        ]);

        expect(
            await prepareTerminalCommand(project, "feature", "logs", "web"),
        ).toEqual({
            action: "logs",
            command:
                "docker compose -f services/compose.yaml logs --follow --tail 200 web",
            serviceName: "web",
        });
        expect(
            (await prepareTerminalCommand(project, "feature", "up")).command,
        ).toContain("up -d");
        expect(
            (await prepareTerminalCommand(project, "feature", "down")).command,
        ).toContain(" down");
        expect(
            (await prepareTerminalCommand(project, "feature", "restart"))
                .command,
        ).toContain(" restart");
    });

    it("rejects unknown services and reports an absent Compose file", async () => {
        const { binPath, project, worktreePath } = await createDockerWorktree();
        await installFakeDocker(binPath);
        await writeFile(
            path.join(worktreePath, "compose.yml"),
            "services: {}\n",
        );

        await expect(
            prepareTerminalCommand(project, "feature", "restart", "missing"),
        ).rejects.toMatchObject({
            code: "DOCKER_SERVICE_NOT_FOUND",
            status: 404,
        });

        await rm(path.join(worktreePath, "compose.yml"));
        expect(await getDockerOverview(project, "feature")).toMatchObject({
            composeCli: null,
            composeFilePath: null,
            services: [],
        });
        await expect(
            prepareTerminalCommand(project, "feature", "up"),
        ).rejects.toMatchObject({
            code: "DOCKER_COMPOSE_FILE_NOT_FOUND",
            status: 404,
        });
    });

    it("reports unavailable Docker when no Compose executable is present", async () => {
        const { binPath, project, worktreePath } = await createDockerWorktree();
        await writeFile(
            path.join(worktreePath, "docker-compose.yml"),
            "services: {}\n",
        );
        process.env.PATH = binPath;

        await expect(
            getDockerOverview(project, "feature"),
        ).rejects.toMatchObject({
            code: "DOCKER_UNAVAILABLE",
            status: 500,
        });
    });
});
