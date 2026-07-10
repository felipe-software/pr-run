import { describe, expect, test } from "bun:test";

import { rankQuickScripts } from "@/backend/handlers/scripts/package-scripts";

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
