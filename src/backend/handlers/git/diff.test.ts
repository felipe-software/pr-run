import { describe, expect, test } from "bun:test";

import {
    parseDiffNameStatus,
    parseDiffNumstat,
} from "@/backend/handlers/git/diff";

describe("diff metadata", () => {
    test("parses binary files and rename destinations", () => {
        expect(parseDiffNumstat("-\t-\tpublic/logo.png\n")).toEqual([
            {
                additions: 0,
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
});
