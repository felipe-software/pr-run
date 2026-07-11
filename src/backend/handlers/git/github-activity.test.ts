import { describe, expect, test } from "bun:test";

import { normalizeReviewComment } from "@/backend/handlers/git/github-activity";

const baseComment = {
    body: "Comment",
    created_at: "2026-07-10T12:00:00Z",
    html_url: "https://github.com/example/repo/pull/1#discussion_r1",
    id: 1,
    path: "src/app.ts",
};

describe("normalizeReviewComment", () => {
    test("preserves diff context and line ranges", () => {
        expect(
            normalizeReviewComment(
                {
                    ...baseComment,
                    diff_hunk: "@@ -10,2 +10,3 @@\n context\n+added",
                    line: 12,
                    side: "RIGHT",
                    start_line: 10,
                    start_side: "RIGHT",
                    subject_type: "line",
                },
                "viewer",
            ),
        ).toMatchObject({
            diffHunk: "@@ -10,2 +10,3 @@\n context\n+added",
            isOutdated: false,
            line: 12,
            side: "RIGHT",
            startLine: 10,
            startSide: "RIGHT",
        });
    });

    test("normalizes a missing diff hunk to an empty string", () => {
        expect(
            normalizeReviewComment(
                { ...baseComment, line: 12, subject_type: "line" },
                "viewer",
            ).diffHunk,
        ).toBe("");
    });

    test("distinguishes file comments from outdated line comments", () => {
        expect(
            normalizeReviewComment(
                { ...baseComment, line: null, subject_type: "file" },
                "viewer",
            ),
        ).toMatchObject({ isOutdated: false, subjectType: "file" });
        expect(
            normalizeReviewComment(
                {
                    ...baseComment,
                    line: null,
                    original_line: 42,
                    subject_type: "line",
                },
                "viewer",
            ),
        ).toMatchObject({
            isOutdated: true,
            line: 42,
            subjectType: "line",
        });
    });
});
