import { describe, expect, test } from "bun:test";
import os from "node:os";
import path from "node:path";

import { resolveTerminalCwd } from "./terminal-path";

describe("resolveTerminalCwd", () => {
    test("expands the home-directory shorthand", () => {
        expect(resolveTerminalCwd("~")).toBe(os.homedir());
    });

    test("resolves regular working directories", () => {
        expect(resolveTerminalCwd("projects/pr-run")).toBe(
            path.resolve("projects/pr-run"),
        );
    });
});
