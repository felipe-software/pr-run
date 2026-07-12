import { describe, expect, test } from "bun:test";

import {
    parseDiffNameStatus,
    parseDiffNumstat,
    parseFileCommitHistory,
} from "@/backend/handlers/git/diff";

describe("diff metadata", () => {
    test("parses binary files and rename destinations", () => {
        expect(parseDiffNumstat("-\t-\tpublic/logo.png\n")).toEqual([
            {
                additions: 0,
                commits: [],
                deletions: 0,
                path: "public/logo.png",
                status: "binary",
            },
        ]);
        expect(parseDiffNameStatus("R100\tsrc/old.ts\tsrc/new.ts\n")).toEqual([
            {
                path: "src/new.ts",
                previousPath: "src/old.ts",
                status: "renamed",
            },
        ]);
    });

    test("groups branch commits by every file they modified", () => {
        const result = parseFileCommitHistory(
            "\x1e123456789\x1f1234567\x1fImprove diff\x1fAda\x1f2026-07-12T10:00:00Z\nsrc/a.ts\nsrc/b.ts\n" +
                "\x1eabcdefghi\x1fabcdefg\x1fFix a\x1fLin\x1f2026-07-12T11:00:00Z\nsrc/a.ts\n",
        );

        expect(
            result.get("src/a.ts")?.map((commit) => commit.shortHash),
        ).toEqual(["1234567", "abcdefg"]);
        expect(result.get("src/b.ts")?.[0]?.subject).toBe("Improve diff");
    });
});
