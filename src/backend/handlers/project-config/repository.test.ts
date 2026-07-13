import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { projectConfigHandler } from "@/backend/handlers/project-config";

let temporaryDirectory = "";
let originalUserDataDirectory: string | undefined;

beforeEach(async () => {
    originalUserDataDirectory = process.env.PR_RUN_USER_DATA_DIR;
    temporaryDirectory = await mkdtemp(
        path.join(os.tmpdir(), "pr-run-config-"),
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

describe("ProjectRepository", () => {
    test("returns the default configuration before the first write", async () => {
        const config = await projectConfigHandler.readConfig();

        expect(config.groups).toEqual([
            {
                collapsed: false,
                id: "default",
                name: "Projects",
                projects: [],
            },
        ]);
    });

    test("serializes concurrent additions without losing a project", async () => {
        const firstProjectPath = path.join(temporaryDirectory, "first");
        const secondProjectPath = path.join(temporaryDirectory, "second");
        await Promise.all([mkdir(firstProjectPath), mkdir(secondProjectPath)]);

        await Promise.all([
            projectConfigHandler.addProject(firstProjectPath),
            projectConfigHandler.addProject(secondProjectPath),
        ]);

        const config = await projectConfigHandler.readConfig();

        expect(
            config.groups.flatMap((group) =>
                group.projects.map((project) => project.name),
            ),
        ).toEqual(["first", "second"]);
    });

    test("returns an existing project when the canonical path is added twice", async () => {
        const projectPath = path.join(temporaryDirectory, "project");
        await mkdir(projectPath);

        const first = await projectConfigHandler.addProject(projectPath);
        const second = await projectConfigHandler.addProject(
            path.join(projectPath, "."),
        );

        expect(second).toEqual(first);
        expect(
            (await projectConfigHandler.readConfig()).groups.flatMap(
                (group) => group.projects,
            ),
        ).toHaveLength(1);
        expect(await projectConfigHandler.findProject(first.id)).toEqual(first);
    });

    test("creates the default group when a valid config does not contain it", async () => {
        const projectPath = path.join(temporaryDirectory, "project");
        await mkdir(projectPath);
        await writeFile(
            path.join(temporaryDirectory, "projects.json"),
            JSON.stringify({
                groups: [
                    {
                        collapsed: true,
                        id: "other",
                        name: "Other",
                        projects: [],
                    },
                ],
            }),
        );

        await projectConfigHandler.addProject(projectPath);
        const config = await projectConfigHandler.readConfig();

        expect(config.groups.map((group) => group.id)).toEqual([
            "default",
            "other",
        ]);
        expect(config.groups[0]?.projects[0]?.name).toBe("project");
    });

    test("rejects missing project paths and unknown project ids", async () => {
        await expect(
            projectConfigHandler.addProject(
                path.join(temporaryDirectory, "missing"),
            ),
        ).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND", status: 404 });
        await expect(
            projectConfigHandler.findProject("missing"),
        ).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND", status: 404 });
    });

    test("rejects persisted configuration that does not match the schema", async () => {
        await writeFile(
            path.join(temporaryDirectory, "projects.json"),
            JSON.stringify({ groups: [{ id: "missing-fields" }] }),
        );

        await expect(projectConfigHandler.readConfig()).rejects.toMatchObject({
            code: "CONFIG_READ_FAILED",
        });
    });

    test("rejects malformed JSON and unreadable config paths", async () => {
        await writeFile(path.join(temporaryDirectory, "projects.json"), "{");
        await expect(projectConfigHandler.readConfig()).rejects.toMatchObject({
            code: "CONFIG_READ_FAILED",
        });

        await rm(path.join(temporaryDirectory, "projects.json"));
        await mkdir(path.join(temporaryDirectory, "projects.json"));
        await expect(projectConfigHandler.readConfig()).rejects.toMatchObject({
            code: "CONFIG_READ_FAILED",
        });
    });
});
