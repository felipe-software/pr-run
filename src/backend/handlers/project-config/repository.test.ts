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

    test("rejects persisted configuration that does not match the schema", async () => {
        await writeFile(
            path.join(temporaryDirectory, "projects.json"),
            JSON.stringify({ groups: [{ id: "missing-fields" }] }),
        );

        await expect(projectConfigHandler.readConfig()).rejects.toMatchObject({
            code: "CONFIG_READ_FAILED",
        });
    });
});
