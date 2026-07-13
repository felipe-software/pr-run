import { describe, expect, test } from "vitest";

import { resolveActivitySide } from "@/lib/components/templates/main-panel/activity/activity-side";
import type {
    CommitInfo,
    GitHubUserInfo,
    WorktreeActivityItem,
} from "@/types/pr-run";

const pullRequestAuthorLogin = "pablohenriq";

describe("resolveActivitySide", () => {
    test("places pull request author commits, comments, and reviews on the left", () => {
        const items = [
            commitActivity(pullRequestAuthorLogin),
            commentActivity(pullRequestAuthorLogin),
            reviewActivity(pullRequestAuthorLogin),
        ];

        expect(
            items.map((item) =>
                resolveActivitySide(item, pullRequestAuthorLogin),
            ),
        ).toEqual(["left", "left", "left"]);
    });

    test("matches GitHub logins case-insensitively after trimming", () => {
        expect(
            resolveActivitySide(
                commentActivity("PabloHenriq"),
                "  pAbLoHeNrIq  ",
            ),
        ).toBe("left");
    });

    test("places reviewers and bots on the right", () => {
        expect(
            resolveActivitySide(
                reviewActivity("felipe-software"),
                pullRequestAuthorLogin,
            ),
        ).toBe("right");
        expect(
            resolveActivitySide(
                commentActivity("github-actions[bot]"),
                pullRequestAuthorLogin,
            ),
        ).toBe("right");
    });

    test("places a commit with no GitHub login on the right for a known pull request", () => {
        expect(
            resolveActivitySide(
                commitActivity(undefined),
                pullRequestAuthorLogin,
            ),
        ).toBe("right");
    });

    test("uses the neutral layout when the pull request author is missing", () => {
        expect(
            resolveActivitySide(
                commentActivity(pullRequestAuthorLogin),
                undefined,
            ),
        ).toBe("neutral");
        expect(
            resolveActivitySide(commentActivity(pullRequestAuthorLogin), " "),
        ).toBe("neutral");
    });
});

function commitActivity(authorLogin?: string): WorktreeActivityItem {
    const commit: CommitInfo = {
        authorEmail: "author@example.com",
        authorLogin,
        authorName: "Author",
        date: "2026-07-11T12:00:00Z",
        hash: "0123456789abcdef",
        isInSelectedBranch: true,
        shortHash: "0123456",
        subject: "Test commit",
    };

    return {
        commit,
        id: "commit-activity",
        occurredAt: commit.date,
        type: "commit",
    };
}

function commentActivity(authorLogin: string): WorktreeActivityItem {
    return {
        comment: {
            author: githubUser(authorLogin),
            body: "Test comment",
            createdAt: "2026-07-11T12:00:00Z",
            id: "comment",
            url: "https://github.com/example/repository/pull/1#issuecomment-1",
            viewerDidAuthor: false,
        },
        id: "comment-activity",
        occurredAt: "2026-07-11T12:00:00Z",
        type: "comment",
    };
}

function reviewActivity(authorLogin: string): WorktreeActivityItem {
    return {
        id: "review-activity",
        occurredAt: "2026-07-11T12:00:00Z",
        review: {
            author: githubUser(authorLogin),
            body: "Test review",
            comments: [],
            id: "review",
            state: "COMMENTED",
            submittedAt: "2026-07-11T12:00:00Z",
        },
        type: "review",
    };
}

function githubUser(login: string): GitHubUserInfo {
    return {
        avatarUrl: `https://github.com/${login}.png`,
        login,
        url: `https://github.com/${login}`,
    };
}
