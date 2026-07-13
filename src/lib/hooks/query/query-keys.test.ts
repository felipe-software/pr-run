import { describe, expect, test } from "vitest";

import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

describe("prRunQueryKeys", () => {
    test("builds global and session query keys", () => {
        expect(prRunQueryKeys.config).toEqual(["pr-run", "config"]);
        expect(prRunQueryKeys.overview()).toEqual([
            "pr-run",
            "overview",
            "all",
        ]);
        expect(prRunQueryKeys.overview("project-a")).toEqual([
            "pr-run",
            "overview",
            "project-a",
        ]);
        expect(prRunQueryKeys.scripts).toEqual(["pr-run", "scripts"]);
        expect(prRunQueryKeys.terminal("session/a")).toEqual([
            "pr-run",
            "terminal",
            "session/a",
        ]);
        expect(prRunQueryKeys.terminalState("session/a")).toEqual([
            "pr-run",
            "terminal",
            "session/a",
            "state",
        ]);
        expect(prRunQueryKeys.scriptSource("script-a")).toEqual([
            "pr-run",
            "scripts",
            "script-a",
            "source",
        ]);
    });

    test("builds every project and branch query key", () => {
        expect(prRunQueryKeys.project("project-a")).toEqual([
            "pr-run",
            "project",
            "project-a",
        ]);
        expect(prRunQueryKeys.branches("project-a")).toEqual([
            "pr-run",
            "project",
            "project-a",
            "branches",
        ]);
        expect(
            prRunQueryKeys.commits("project-a", "feature/a", "main"),
        ).toEqual([
            "pr-run",
            "project",
            "project-a",
            "branch",
            "feature/a",
            "base",
            "main",
            "commits",
        ]);
        expect(prRunQueryKeys.commitDiff("project-a", "abc1234")).toEqual([
            "pr-run",
            "project",
            "project-a",
            "commit",
            "abc1234",
            "diff",
        ]);
        expect(
            prRunQueryKeys.file("project-a", "feature/a", "src/a.ts"),
        ).toEqual([
            "pr-run",
            "project",
            "project-a",
            "branch",
            "feature/a",
            "file",
            "src/a.ts",
        ]);
        expect(prRunQueryKeys.docker("project-a", "feature/a").at(-1)).toBe(
            "docker",
        );
        expect(prRunQueryKeys.env("project-a", "feature/a").at(-1)).toBe("env");
        expect(
            prRunQueryKeys.packageScripts("project-a", "feature/a").at(-1),
        ).toBe("package-scripts");
    });

    test("distinguishes branch activity and diff keys from pull requests", () => {
        expect(prRunQueryKeys.activity("p", "b", "main").at(-1)).toBe("branch");
        expect(prRunQueryKeys.activity("p", "b", "main", 42).at(-1)).toBe(42);
        expect(prRunQueryKeys.diff("p", "b", "main").at(-1)).toBe("branch");
        expect(prRunQueryKeys.diff("p", "b", "main", 42).at(-1)).toBe(42);

        expect(prRunQueryKeys.branches("one")).not.toEqual(
            prRunQueryKeys.branches("two"),
        );
        expect(prRunQueryKeys.diff("p", "one", "main")).not.toEqual(
            prRunQueryKeys.diff("p", "two", "main"),
        );
    });
});
