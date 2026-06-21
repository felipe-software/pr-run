import { describe, expect, it } from "bun:test";

import {
    compareEnvFileNames,
    isEnvFileName,
    parseWorktreeList,
} from "@/backend/handlers/git/helpers";
import { buildWorktreeMap } from "@/backend/handlers/git/worktree-inventory";

describe("isEnvFileName", () => {
    it("matches .env and .env.* files", () => {
        expect(isEnvFileName(".env")).toBe(true);
        expect(isEnvFileName(".env.local")).toBe(true);
        expect(isEnvFileName(".env.production.local")).toBe(true);
    });

    it("ignores unrelated dotfiles", () => {
        expect(isEnvFileName(".envrc")).toBe(false);
        expect(isEnvFileName(".example.env")).toBe(false);
        expect(isEnvFileName("env.local")).toBe(false);
    });
});

describe("compareEnvFileNames", () => {
    it("keeps .env first and sorts the remaining files", () => {
        expect(
            [".env.production", ".env", ".env.local", ".env.development"].sort(
                compareEnvFileNames,
            ),
        ).toEqual([
            ".env",
            ".env.development",
            ".env.local",
            ".env.production",
        ]);
    });
});

describe("worktree inventory", () => {
    it("maps branches to their registered paths and ignores detached worktrees", () => {
        const worktrees = parseWorktreeList(`worktree /home/smart/work/project
HEAD 123456
branch refs/heads/main

worktree /home/smart/work/project with spaces
HEAD abcdef
branch refs/heads/feature/example

worktree /home/smart/work/detached
HEAD fedcba
detached
`);
        const worktreeMap = buildWorktreeMap(worktrees);

        expect(worktrees).toHaveLength(3);
        expect(worktreeMap.get("main")?.path).toBe("/home/smart/work/project");
        expect(worktreeMap.get("feature/example")?.path).toBe(
            "/home/smart/work/project with spaces",
        );
        expect(worktreeMap.size).toBe(2);
    });
});
