import { describe, expect, test } from "vitest";

import { parseOverviewDiffStats } from "@/backend/handlers/git/overview";

describe("parseOverviewDiffStats", () => {
    test("sums text changes and keeps binary files in the changed file count", () => {
        expect(
            parseOverviewDiffStats("12\t3\tsrc/app.ts\n-\t-\timage.png\n"),
        ).toEqual({
            additions: 12,
            changedFiles: 2,
            deletions: 3,
        });
    });
});
