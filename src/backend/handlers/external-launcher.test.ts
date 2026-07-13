import { describe, expect, test } from "vitest";

import { externalLauncherHandler } from "@/backend/handlers/external-launcher";

const neverResolve = () => undefined;

describe("external launcher locations", () => {
    test("normalizes strings and preserves line locations", () => {
        expect(
            externalLauncherHandler.normalizeTextFileLocation(" /tmp/a.ts "),
        ).toEqual({
            column: undefined,
            filePath: "/tmp/a.ts",
            line: undefined,
        });
        expect(
            externalLauncherHandler.normalizeTextFileLocation({
                column: 4,
                filePath: " /tmp/a.ts ",
                line: 12,
            }),
        ).toEqual({ column: 4, filePath: "/tmp/a.ts", line: 12 });
    });

    test.each(["", "   "])("rejects an empty path", (filePath) => {
        expect(() =>
            externalLauncherHandler.normalizeTextFileLocation(filePath),
        ).toThrow(expect.objectContaining({ code: "BAD_REQUEST" }));
    });

    test("formats missing, line-only, and line-column locations", () => {
        expect(
            externalLauncherHandler.formatPathLocation({
                filePath: "/tmp/a.ts",
            }),
        ).toBe("/tmp/a.ts");
        expect(
            externalLauncherHandler.formatPathLocation({
                column: 0,
                filePath: "/tmp/a.ts",
                line: 12,
            }),
        ).toBe("/tmp/a.ts:12");
        expect(
            externalLauncherHandler.formatPathLocation({
                column: 4,
                filePath: "/tmp/a.ts",
                line: 12,
            }),
        ).toBe("/tmp/a.ts:12:4");
        expect(
            externalLauncherHandler.formatPathLocation({
                column: 4,
                filePath: "/tmp/a.ts",
                line: -1,
            }),
        ).toBe("/tmp/a.ts");
    });
});

describe("resolveEditorLaunch", () => {
    test("builds VS Code goto arguments from an alias", () => {
        expect(
            externalLauncherHandler.resolveEditorLaunch(
                { column: 4, filePath: "/tmp/a.ts", line: 12 },
                {
                    commandResolver: (command) =>
                        command === "code" ? "/usr/bin/code" : undefined,
                    configuredEditor: "code",
                    platform: "linux",
                },
            ),
        ).toEqual({
            args: ["--goto", "/tmp/a.ts:12:4"],
            command: "code",
            editor: "vscode",
        });
    });

    test("builds direct-path and line-column editor arguments", () => {
        expect(
            externalLauncherHandler.resolveEditorLaunch("/tmp/a.ts", {
                commandResolver: (command) =>
                    command === "zed" ? "/usr/bin/zed" : undefined,
                configuredEditor: "zed",
            }),
        ).toMatchObject({ args: ["/tmp/a.ts"], editor: "zed" });
        expect(
            externalLauncherHandler.resolveEditorLaunch(
                { column: 3, filePath: "/tmp/a.ts", line: 9 },
                {
                    commandResolver: (command) =>
                        command === "idea" ? "/usr/bin/idea" : undefined,
                    configuredEditor: "idea",
                },
            ),
        ).toMatchObject({
            args: ["--line", "9", "--column", "3", "/tmp/a.ts"],
            editor: "idea",
        });
        expect(
            externalLauncherHandler.resolveEditorLaunch(
                { filePath: "/tmp/a.ts", line: 0 },
                {
                    commandResolver: (command) =>
                        command === "idea" ? "/usr/bin/idea" : undefined,
                    configuredEditor: "idea",
                },
            ).args,
        ).toEqual(["/tmp/a.ts"]);
    });

    test.each([
        ["darwin", "open"],
        ["win32", "explorer"],
        ["linux", "xdg-open"],
    ] as const)("falls back to the %s file manager", (platform, command) => {
        expect(
            externalLauncherHandler.resolveEditorLaunch("/tmp/a.ts", {
                commandResolver: neverResolve,
                platform,
            }),
        ).toEqual({
            args: ["/tmp/a.ts"],
            command,
            editor: "file-manager",
        });
    });

    test("includes editor base arguments", () => {
        expect(
            externalLauncherHandler.resolveEditorLaunch("/tmp/a.ts", {
                commandResolver: (command) =>
                    command === "kiro" ? "/usr/bin/kiro" : undefined,
                configuredEditor: "kiro",
            }).args,
        ).toEqual(["ide", "--goto", "/tmp/a.ts"]);
    });

    test("rejects unknown and unavailable configured editors", () => {
        expect(() =>
            externalLauncherHandler.resolveEditorLaunch("/tmp/a.ts", {
                commandResolver: neverResolve,
                configuredEditor: "unknown",
            }),
        ).toThrow(expect.objectContaining({ code: "EDITOR_NOT_FOUND" }));
        expect(() =>
            externalLauncherHandler.resolveEditorLaunch("/tmp/a.ts", {
                commandResolver: neverResolve,
                configuredEditor: "cursor",
            }),
        ).toThrow(expect.objectContaining({ code: "EDITOR_NOT_FOUND" }));
    });
});
