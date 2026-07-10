import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
    buildPackageScriptCommand,
    detectPackageManager,
    rankQuickScripts,
} from "@/backend/handlers/scripts/package-scripts";

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

    test("defaults unidentified Node projects to npm", async () => {
        const directory = await mkdtemp(path.join(os.tmpdir(), "pr-run-pm-"));

        expect(await detectPackageManager(directory, {})).toBe("npm");
        await writeFile(path.join(directory, "bun.lock"), "");
        expect(await detectPackageManager(directory, {})).toBe("bun");
        await rm(directory, { force: true, recursive: true });
    });
});
