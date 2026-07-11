import { describe, expect, test } from "bun:test";

import { parseReviewDiff } from "@/lib/components/templates/main-panel/activity/review-diff";

const hunk = `@@ -10,3 +10,4 @@ function example() {
 context
-old value
+new value
+another value`;

describe("review diff context", () => {
    test("parses a GitHub hunk with its file path", () => {
        const fileDiff = parseReviewDiff("src/example file.ts", hunk);

        expect(fileDiff?.name).toBe("src/example file.ts");
        expect(fileDiff?.hunks).toHaveLength(1);
        expect(fileDiff?.hunks[0]).toMatchObject({
            additionStart: 10,
            deletionStart: 10,
        });
    });

    test("returns no diff for empty or malformed content", () => {
        expect(parseReviewDiff("src/example.ts", "")).toBeUndefined();
        expect(
            parseReviewDiff("src/example.ts", "not a unified diff"),
        ).toBeUndefined();
    });

    test("keeps truncated GitHub hunks renderable", () => {
        const fileDiff = parseReviewDiff(
            "src/example.ts",
            "@@ -10,100 +10,100 @@ function example() {\n context",
        );

        expect(fileDiff?.hunks).toHaveLength(1);
        expect(fileDiff?.hunks[0]?.hunkContent).toHaveLength(1);
    });
});
