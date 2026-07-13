import { execFile } from "node:child_process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { envFilesHandler } from "@/backend/handlers/env-files";

const execFileAsync = promisify(execFile);

let temporaryDirectory = "";
let projectPath = "";
let worktreePath = "";

async function git(...args: string[]) {
    await execFileAsync("git", args, { cwd: projectPath });
}

beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "pr-run-env-"));
    projectPath = path.join(temporaryDirectory, "project");
    worktreePath = path.join(temporaryDirectory, "feature-worktree");
    await mkdir(projectPath);
    await execFileAsync("git", ["init", "-b", "main", projectPath]);
    await git("config", "user.email", "tests@example.com");
    await git("config", "user.name", "PR Run Tests");
    await writeFile(path.join(projectPath, "README.md"), "root\n");
    await git("add", "README.md");
    await git("commit", "-m", "initial");
    await git("branch", "feature");
    await git("worktree", "add", worktreePath, "feature");
});

afterEach(async () => {
    await rm(temporaryDirectory, { force: true, recursive: true });
});

describe("environment file overview", () => {
    test("links shared files and reads regular, linked, empty, and broken files", async () => {
        await writeFile(path.join(projectPath, ".env"), "TOKEN=secret\n");
        await writeFile(path.join(worktreePath, ".env.local"), "LOCAL=1\n");
        await writeFile(path.join(worktreePath, ".env.empty"), "");
        await symlink(
            path.join(worktreePath, "missing.env"),
            path.join(worktreePath, ".env.broken"),
        );
        await writeFile(path.join(worktreePath, ".envrc"), "ignored\n");

        const result = await envFilesHandler.getEnvFilesOverview(
            { id: "project", name: "Project", path: projectPath },
            "feature",
        );

        expect(result).toMatchObject({
            branch: "feature",
            worktreePath,
        });
        expect(result.files.map((file) => file.name)).toEqual([
            ".env",
            ".env.broken",
            ".env.empty",
            ".env.local",
        ]);
        expect(result.files[0]).toMatchObject({
            content: "TOKEN=secret\n",
            isSymbolicLink: true,
            linkedPath: path.join(projectPath, ".env"),
        });
        expect(result.files[1]).toMatchObject({
            isSymbolicLink: true,
            linkedPath: path.join(worktreePath, "missing.env"),
        });
        expect(result.files[1]?.readError).toContain("ENOENT");
        expect(result.files[2]).toMatchObject({
            content: "",
            isSymbolicLink: false,
        });
        expect(result.files[3]).toMatchObject({
            content: "LOCAL=1\n",
            isSymbolicLink: false,
        });
    });

    test("reports a missing worktree before attempting environment reads", async () => {
        await expect(
            envFilesHandler.getEnvFilesOverview(
                { id: "project", name: "Project", path: projectPath },
                "missing",
            ),
        ).rejects.toMatchObject({ code: "WORKTREE_NOT_FOUND", status: 404 });
    });
});
