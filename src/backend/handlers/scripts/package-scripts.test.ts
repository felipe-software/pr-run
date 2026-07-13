import { execFile } from "node:child_process";
import { afterEach, describe, expect, test } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import {
    buildPackageScriptCommand,
    detectPackageManager,
    getPackageScriptCatalog,
    preparePackageScriptTerminalCommand,
    rankQuickScripts,
} from "@/backend/handlers/scripts/package-scripts";

const execFileAsync = promisify(execFile);
const fixtureDirectories: string[] = [];

afterEach(async () => {
    await Promise.all(
        fixtureDirectories
            .splice(0)
            .map((directory) =>
                rm(directory, { force: true, recursive: true }),
            ),
    );
});

async function createPackageWorktree() {
    const directory = await mkdtemp(path.join(os.tmpdir(), "pr-run-pkg-"));
    fixtureDirectories.push(directory);
    const projectPath = path.join(directory, "project");
    const worktreePath = path.join(directory, "feature-worktree");
    await mkdir(projectPath);
    await execFileAsync("git", ["init", "-b", "main", projectPath]);
    const git = (...args: string[]) =>
        execFileAsync("git", args, { cwd: projectPath });
    await git("config", "user.email", "tests@example.com");
    await git("config", "user.name", "PR Run Tests");
    await writeFile(
        path.join(projectPath, "package.json"),
        JSON.stringify({ name: "root", scripts: { build: "bun build.ts" } }),
    );
    await git("add", "package.json");
    await git("commit", "-m", "initial");
    await git("branch", "feature");
    await git("worktree", "add", worktreePath, "feature");

    return { projectPath, worktreePath };
}

describe("rankQuickScripts", () => {
    test("prioritizes common root scripts and limits the quick list", () => {
        const names = [
            "android",
            "dev",
            "start",
            "test",
            "lint",
            "typecheck",
            "build",
            "release",
        ];
        const scripts = names.map((name) => ({
            command: name,
            name,
            packageName: "app",
            packagePath: ".",
            quick: false,
        }));

        expect(
            rankQuickScripts([{ name: "app", path: ".", scripts }]).map(
                (script) => script.name,
            ),
        ).toEqual(["dev", "start", "test", "lint", "typecheck", "build"]);
    });

    test("fills remaining slots from root scripts in declaration order", () => {
        const scripts = ["custom-a", "lint", "custom-b", "custom-c"].map(
            (name) => ({
                command: name,
                name,
                packageName: "root",
                packagePath: ".",
                quick: false,
            }),
        );

        expect(
            rankQuickScripts([{ name: "root", path: ".", scripts }]).map(
                (script) => script.name,
            ),
        ).toEqual(["lint", "custom-a", "custom-b", "custom-c"]);
    });

    test("ignores workspace scripts when no root package is present", () => {
        expect(
            rankQuickScripts([
                {
                    name: "workspace",
                    path: "packages/app",
                    scripts: [
                        {
                            command: "bun run dev",
                            name: "dev",
                            packageName: "workspace",
                            packagePath: "packages/app",
                            quick: false,
                        },
                    ],
                },
            ]),
        ).toEqual([]);
    });
});

describe("package script commands", () => {
    test("always changes to the absolute package directory", () => {
        expect(
            buildPackageScriptCommand(
                "bun",
                "/workspace/project",
                { name: "test watch", packagePath: "." },
                "linux",
            ),
        ).toBe("cd '/workspace/project' && bun run 'test watch'");
        expect(
            buildPackageScriptCommand(
                "npm",
                "/workspace/project",
                { name: "test watch", packagePath: "packages/app" },
                "win32",
            ),
        ).toBe(
            'cd /d "/workspace/project/packages/app" && npm run "test watch"',
        );
    });

    test("quotes embedded quotes for POSIX and Windows shells", () => {
        expect(
            buildPackageScriptCommand(
                "pnpm",
                "/workspace/it's project",
                { name: "test's", packagePath: "packages/app" },
                "linux",
            ),
        ).toBe(
            "cd '/workspace/it'\\''s project/packages/app' && pnpm run 'test'\\''s'",
        );
        expect(
            buildPackageScriptCommand(
                "yarn",
                "C:\\workspace\\project",
                { name: 'test "watch"', packagePath: "." },
                "win32",
            ),
        ).toContain('yarn run "test \\"watch\\""');
    });

    test("defaults unidentified Node projects to npm", async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), "pr-run-pm-"));

        expect(await detectPackageManager(directory, {})).toBe("npm");
        await writeFile(path.join(directory, "bun.lock"), "");
        expect(await detectPackageManager(directory, {})).toBe("bun");
        await rm(directory, { force: true, recursive: true });
    });

    test.each(["bun", "npm", "pnpm", "yarn"] as const)(
        "uses the package manager declared by the manifest: %s",
        async (manager) => {
            expect(
                await detectPackageManager("/missing", {
                    packageManager: `${manager}@1.2.3`,
                }),
            ).toBe(manager);
        },
    );

    test("uses lockfile precedence and ignores unsupported declarations", async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), "pr-run-pm-"));

        await writeFile(path.join(directory, "package-lock.json"), "");
        await writeFile(path.join(directory, "yarn.lock"), "");
        await writeFile(path.join(directory, "pnpm-lock.yaml"), "");
        expect(
            await detectPackageManager(directory, {
                packageManager: "deno@2",
            }),
        ).toBe("pnpm");

        await writeFile(path.join(directory, "bun.lockb"), "");
        expect(await detectPackageManager(directory, {})).toBe("bun");

        await rm(directory, { force: true, recursive: true });
    });
});

describe("package script catalogs", () => {
    test("discovers sorted workspace scripts and marks root quick scripts", async () => {
        const { projectPath, worktreePath } = await createPackageWorktree();
        await mkdir(path.join(worktreePath, "packages", "tool"), {
            recursive: true,
        });
        await mkdir(path.join(worktreePath, "packages", "app"), {
            recursive: true,
        });
        await mkdir(path.join(worktreePath, "packages", "empty"), {
            recursive: true,
        });
        await writeFile(
            path.join(worktreePath, "package.json"),
            JSON.stringify({
                name: "root",
                packageManager: "bun@1.3.14",
                scripts: {
                    custom: "bun custom.ts",
                    dev: "bun dev.ts",
                    lint: "bun lint.ts",
                },
                workspaces: { packages: ["packages/*/"] },
            }),
        );
        await writeFile(
            path.join(worktreePath, "packages", "app", "package.json"),
            JSON.stringify({
                name: "@scope/app",
                scripts: { dev: "vite", test: "vitest" },
            }),
        );
        await writeFile(
            path.join(worktreePath, "packages", "tool", "package.json"),
            JSON.stringify({ scripts: { check: "tsc" } }),
        );
        await writeFile(
            path.join(worktreePath, "packages", "empty", "package.json"),
            JSON.stringify({ name: "empty" }),
        );

        const project = {
            id: "project",
            name: "Project",
            path: projectPath,
        };
        const catalog = await getPackageScriptCatalog(project, "feature");

        expect(catalog.manager).toBe("bun");
        expect(catalog.packages.map((group) => group.path)).toEqual([
            ".",
            "packages/app",
            "packages/tool",
        ]);
        expect(catalog.packages[2]).toMatchObject({
            name: "packages/tool",
            scripts: [{ name: "check", packageName: "packages/tool" }],
        });
        expect(catalog.quickScripts.map((script) => script.name)).toEqual([
            "dev",
            "lint",
            "custom",
        ]);
        expect(
            catalog.packages[0]?.scripts.map((script) => script.quick),
        ).toEqual([true, true, true]);
        expect(
            catalog.packages[1]?.scripts.every((script) => !script.quick),
        ).toBe(true);

        const command = await preparePackageScriptTerminalCommand(
            project,
            "feature",
            "packages/app",
            "test",
        );
        expect(command).toEqual({
            command: `cd '${path.join(worktreePath, "packages", "app")}' && bun run 'test'`,
            title: "@scope/app: test",
        });
    });

    test("maps missing scripts and invalid manifests to domain errors", async () => {
        const { projectPath, worktreePath } = await createPackageWorktree();
        const project = {
            id: "project",
            name: "Project",
            path: projectPath,
        };

        await expect(
            preparePackageScriptTerminalCommand(
                project,
                "feature",
                ".",
                "missing",
            ),
        ).rejects.toMatchObject({
            code: "PACKAGE_SCRIPT_NOT_FOUND",
            status: 404,
        });

        await writeFile(path.join(worktreePath, "package.json"), "{");
        await expect(
            getPackageScriptCatalog(project, "feature"),
        ).rejects.toMatchObject({
            code: "PACKAGE_SCRIPTS_READ_FAILED",
            status: 500,
        });
    });
});
