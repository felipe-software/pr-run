import { describe, expect, test } from "vitest";

import {
    normalizeGeneralComment,
    normalizePullRequestCommitHashes,
    normalizeReviewComment,
} from "@/backend/handlers/git/github-activity";

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

describe("normalizeGeneralComment", () => {
    test("preserves GitHub App avatar metadata", () => {
        const comment = normalizeGeneralComment(
            {
                body: "Preview build",
                created_at: "2026-07-08T12:35:00Z",
                html_url:
                    "https://github.com/example/repo/pull/1#issuecomment-2",
                id: 2,
                user: {
                    avatar_url:
                        "https://avatars.githubusercontent.com/in/15368?v=4",
                    html_url: "https://github.com/apps/github-actions",
                    login: "github-actions[bot]",
                },
            },
            "reviewer",
        );

        expect(comment?.author).toEqual({
            avatarUrl: "https://avatars.githubusercontent.com/in/15368?v=4",
            login: "github-actions[bot]",
            url: "https://github.com/apps/github-actions",
        });
        expect(comment?.id).toBe("2");
    });
});

describe("normalizePullRequestCommitHashes", () => {
    test("flattens paginated commits and removes missing or duplicate hashes", () => {
        expect(
            normalizePullRequestCommitHashes([
                [{ sha: "first" }, { sha: "second" }],
                [{ sha: "second" }, {}, { sha: "  third  " }],
            ]),
        ).toEqual(["first", "second", "third"]);
    });
});
