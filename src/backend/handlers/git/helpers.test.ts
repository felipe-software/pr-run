import { describe, expect, it } from "bun:test";

import {
    compareEnvFileNames,
    isEnvFileName,
} from "@/backend/handlers/git/helpers";

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
