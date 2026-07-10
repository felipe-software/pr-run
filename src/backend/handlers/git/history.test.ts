import { describe, expect, test } from "bun:test";

import { parseCommitHistory } from "@/backend/handlers/git/history";

describe("parseCommitHistory", () => {
    test("collects text and binary statistics for every commit", () => {
        const output = [
            "\x1eabc123\x1fabc123\x1fAdd files\x1fAda\x1fada@example.com\x1f2026-07-09T10:00:00Z",
            "12\t3\tsrc/app.ts",
            "-\t-\tpublic/logo.png",
            "\x1edef456\x1fdef456\x1fMerge branch\x1fGrace\x1fgrace@example.com\x1f2026-07-08T10:00:00Z",
        ].join("\n");

        expect(parseCommitHistory(output)).toEqual([
            expect.objectContaining({
                additions: 12,
                deletions: 3,
                hasBinaryChanges: true,
                hash: "abc123",
            }),
            expect.objectContaining({
                additions: undefined,
                deletions: undefined,
                hasBinaryChanges: false,
                hash: "def456",
            }),
        ]);
    });
});
