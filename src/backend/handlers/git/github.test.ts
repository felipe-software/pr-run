import { describe, expect, test } from "bun:test";

import { normalizeGitHubPullRequests } from "@/backend/handlers/git/github";

describe("normalizeGitHubPullRequests", () => {
    test("normalizes PR identity and review workflow people", () => {
        const [pullRequest] = normalizeGitHubPullRequests([
            {
                assignees: [{ login: "assignee" }],
                author: {
                    avatarUrl: "https://avatars.example/author.png",
                    login: "author",
                    url: "https://github.com/author",
                },
                baseRefName: "main",
                headRefName: "feat/sidebar-identity",
                latestReviews: [
                    {
                        author: { login: "reviewer" },
                        state: "APPROVED",
                    },
                ],
                number: 42,
                reviewRequests: [{ login: "requested-reviewer" }],
                title: "Show PR identity in the sidebar",
                updatedAt: "2026-07-10T12:00:00Z",
                url: "https://github.com/example/repository/pull/42",
            },
        ]);

        expect(pullRequest).toMatchObject({
            assignees: [
                {
                    avatarUrl: "https://github.com/assignee.png?size=64",
                    login: "assignee",
                    url: "https://github.com/assignee",
                },
            ],
            author: {
                avatarUrl: "https://avatars.example/author.png",
                login: "author",
                url: "https://github.com/author",
            },
            latestReviews: [
                {
                    author: {
                        avatarUrl: "https://github.com/reviewer.png?size=64",
                        login: "reviewer",
                        url: "https://github.com/reviewer",
                    },
                    state: "APPROVED",
                },
            ],
            reviewRequests: [
                {
                    avatarUrl:
                        "https://github.com/requested-reviewer.png?size=64",
                    login: "requested-reviewer",
                    url: "https://github.com/requested-reviewer",
                },
            ],
        });
    });

    test("uses empty participant arrays and ignores entries without logins", () => {
        const [emptyPullRequest, filteredPullRequest] =
            normalizeGitHubPullRequests([
                {
                    baseRefName: "main",
                    headRefName: "empty",
                    number: 1,
                    title: "Empty workflow",
                    url: "https://github.com/example/repository/pull/1",
                },
                {
                    assignees: [null, { login: null }],
                    baseRefName: "main",
                    headRefName: "filtered",
                    latestReviews: [
                        null,
                        { author: { login: null }, state: "APPROVED" },
                    ],
                    number: 2,
                    reviewRequests: [null, { login: null }],
                    title: "Filtered workflow",
                    url: "https://github.com/example/repository/pull/2",
                },
            ]);

        expect(emptyPullRequest?.assignees).toEqual([]);
        expect(emptyPullRequest?.latestReviews).toEqual([]);
        expect(emptyPullRequest?.reviewRequests).toEqual([]);
        expect(filteredPullRequest?.assignees).toEqual([]);
        expect(filteredPullRequest?.latestReviews).toEqual([]);
        expect(filteredPullRequest?.reviewRequests).toEqual([]);
    });
});
