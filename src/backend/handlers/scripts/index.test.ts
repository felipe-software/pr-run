import { execFile } from "node:child_process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
    mkdir,
    mkdtemp,
    readFile,
    readdir,
    rm,
    writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { scriptsHandler } from "@/backend/handlers/scripts";

const execFileAsync = promisify(execFile);

let temporaryDirectory = "";
let originalUserDataDirectory: string | undefined;

function scriptsDirectory() {
    return path.join(temporaryDirectory, "scripts");
}

beforeEach(async () => {
    originalUserDataDirectory = process.env.PR_RUN_USER_DATA_DIR;
    temporaryDirectory = await mkdtemp(
        path.join(os.tmpdir(), "pr-run-scripts-"),
    );
    process.env.PR_RUN_USER_DATA_DIR = temporaryDirectory;
});

afterEach(async () => {
    if (originalUserDataDirectory === undefined) {
        delete process.env.PR_RUN_USER_DATA_DIR;
    } else {
        process.env.PR_RUN_USER_DATA_DIR = originalUserDataDirectory;
    }

    await rm(temporaryDirectory, { force: true, recursive: true });
});

async function createProjectWorktree() {
    const projectPath = path.join(temporaryDirectory, "project");
    const worktreePath = path.join(temporaryDirectory, "feature-worktree");
    await mkdir(projectPath);
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
        project: { id: "project", name: "Project", path: projectPath },
        worktreePath,
    };
}

describe("script file lifecycle", () => {
    test("creates, lists, reads, updates, and deletes a script", async () => {
        const created = await scriptsHandler.createScript("  Deploy app  ");

        expect(created).toMatchObject({
            button: true,
            lifecycles: [],
            title: "Deploy app",
        });
        expect(created.fileName).toMatch(/^deploy-app-[\da-f-]{36}\.ts$/i);
        expect(
            (await scriptsHandler.listScripts()).map((item) => item.id),
        ).toEqual([created.id]);

        const sourceResult = await scriptsHandler.getScriptSource(created.id);
        expect(sourceResult).toMatchObject({
            filePath: created.filePath,
            scriptId: created.id,
        });
        expect(sourceResult.source).toContain('title: "Deploy app"');

        const updatedSource = sourceResult.source.replace(
            'title: "Deploy app"',
            'title: "Updated deploy"',
        );
        const updated = await scriptsHandler.updateScriptSource(
            created.id,
            updatedSource,
        );
        expect(updated).toMatchObject({
            fileName: created.fileName,
            id: created.id,
            title: "Updated deploy",
        });
        expect(await readFile(created.filePath, "utf8")).toBe(updatedSource);

        const deleted = await scriptsHandler.deleteScript(created.id);
        expect(deleted.title).toBe("Updated deploy");
        expect(await scriptsHandler.listScripts()).toEqual([]);
    });

    test("normalizes punctuation-only and accented titles into safe file names", async () => {
        const accented = await scriptsHandler.createScript("Café release");
        const punctuation = await scriptsHandler.createScript("!!!");

        expect(accented.fileName).toMatch(/^cafe-release-/);
        expect(punctuation.fileName).toMatch(/^script-/);
    });

    test("rejects blank titles and unknown script ids", async () => {
        await expect(scriptsHandler.createScript(" \n ")).rejects.toMatchObject(
            {
                code: "BAD_REQUEST",
                status: 400,
            },
        );
        await expect(
            scriptsHandler.getScriptSource("missing"),
        ).rejects.toMatchObject({ code: "SCRIPT_NOT_FOUND", status: 404 });
        await expect(
            scriptsHandler.deleteScript("missing"),
        ).rejects.toMatchObject({ code: "SCRIPT_NOT_FOUND", status: 404 });
    });

    test("keeps the original source when an update is invalid", async () => {
        const created = await scriptsHandler.createScript("Valid script");
        const original = await readFile(created.filePath, "utf8");

        await expect(
            scriptsHandler.updateScriptSource(
                created.id,
                "this is not valid TypeScript }",
            ),
        ).rejects.toMatchObject({ code: "SCRIPT_LOAD_FAILED", status: 400 });

        expect(await readFile(created.filePath, "utf8")).toBe(original);
        expect(
            (await readdir(scriptsDirectory())).some((name) =>
                name.startsWith("_validate-"),
            ),
        ).toBe(false);
    });

    test("lists invalid scripts with fallback metadata and ignores internal files", async () => {
        await scriptsHandler.listScripts();
        const invalidId = "11111111-1111-4111-8111-111111111111";
        await writeFile(
            path.join(scriptsDirectory(), `broken-action-${invalidId}.ts`),
            "throw new Error('broken import');\n",
        );
        await writeFile(path.join(scriptsDirectory(), "notes.txt"), "ignored");
        await writeFile(
            path.join(scriptsDirectory(), "_loaded-old.ts"),
            "stale",
        );
        await mkdir(path.join(scriptsDirectory(), "folder.ts"));

        const scripts = await scriptsHandler.listScripts();

        expect(scripts).toHaveLength(1);
        expect(scripts[0]).toMatchObject({
            button: false,
            id: invalidId,
            lifecycles: [],
            title: "Broken Action",
        });
        expect(scripts[0]?.loadError).toContain("broken import");
        expect(await readdir(scriptsDirectory())).not.toContain(
            "_loaded-old.ts",
        );
    });

    test("deletes an invalid script using fallback metadata", async () => {
        await scriptsHandler.listScripts();
        await writeFile(
            path.join(scriptsDirectory(), "legacy-action.ts"),
            "invalid source }",
        );

        const deleted = await scriptsHandler.deleteScript("legacy-action");

        expect(deleted).toMatchObject({
            button: false,
            id: "legacy-action",
            title: "Legacy Action",
        });
        expect(deleted.loadError).toBeTruthy();
    });
});

describe("script execution", () => {
    test("prepares a terminal payload and executes a successful script", async () => {
        const { project, worktreePath } = await createProjectWorktree();
        const script = await scriptsHandler.createScript("Run checks");

        const prepared = await scriptsHandler.prepareTerminalCommand(
            project,
            "feature",
            script.id,
        );

        expect(prepared.command).toContain("PR_RUN_SCRIPT_TERMINAL=1 bun");
        const payloadPath = prepared.command.match(
            /'([^']+_run-[^']+\.json)'$/,
        )?.[1];
        expect(payloadPath).toBeTruthy();
        const terminalPayload = JSON.parse(
            await readFile(payloadPath!, "utf8"),
        ) as Record<string, unknown>;
        expect(terminalPayload).toMatchObject({
            action: "run",
            context: {
                branch: "feature",
                projectId: "project",
                worktreePath,
            },
            scriptId: script.id,
        });

        expect(
            await scriptsHandler.runScript(project, "feature", script.id),
        ).toMatchObject({ success: true });
    });

    test("returns a reported script failure and wraps execution crashes", async () => {
        const { project } = await createProjectWorktree();
        const reportedFailure = await scriptsHandler.createScript("Fail check");
        const reportedSource = (
            await scriptsHandler.getScriptSource(reportedFailure.id)
        ).source.replace("return true;", "return false;");
        await scriptsHandler.updateScriptSource(
            reportedFailure.id,
            reportedSource,
        );

        expect(
            await scriptsHandler.runScript(
                project,
                "feature",
                reportedFailure.id,
            ),
        ).toMatchObject({ success: false });

        const crashing = await scriptsHandler.createScript("Crash check");
        const crashingSource = (
            await scriptsHandler.getScriptSource(crashing.id)
        ).source.replace("return true;", 'throw new Error("script crashed");');
        await scriptsHandler.updateScriptSource(crashing.id, crashingSource);

        await expect(
            scriptsHandler.runScript(project, "feature", crashing.id),
        ).rejects.toMatchObject({
            code: "SCRIPT_EXECUTION_FAILED",
            status: 500,
        });
    });

    test("streams the runner result and exposes cancellation-safe headers", async () => {
        const { project } = await createProjectWorktree();
        const script = await scriptsHandler.createScript("Stream check");

        const response = await scriptsHandler.streamScript(
            project,
            "feature",
            script.id,
        );
        const output = await response.text();

        expect(response.headers.get("content-type")).toContain(
            "application/x-ndjson",
        );
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(output).toContain("__PR_RUN_SCRIPT_RESULT__");
        expect(output).toContain('"success":true');
    });

    test("rejects execution when the branch has no worktree", async () => {
        const projectPath = path.join(temporaryDirectory, "project");
        await mkdir(projectPath);
        await execFileAsync("git", ["init", "-b", "main", projectPath]);
        const script = await scriptsHandler.createScript("No worktree");

        await expect(
            scriptsHandler.runScript(
                { id: "project", name: "Project", path: projectPath },
                "missing",
                script.id,
            ),
        ).rejects.toMatchObject({ code: "WORKTREE_NOT_FOUND" });
    });
});
