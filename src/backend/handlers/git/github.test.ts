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
                isDraft: false,
                number: 42,
                reviewRequests: [{ login: "requested-reviewer" }],
                state: "OPEN",
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
            isDraft: false,
            reviewRequests: [
                {
                    avatarUrl:
                        "https://github.com/requested-reviewer.png?size=64",
                    login: "requested-reviewer",
                    url: "https://github.com/requested-reviewer",
                },
            ],
            state: "OPEN",
        });
    });

    test("uses empty participant arrays and ignores entries without logins", () => {
        const [emptyPullRequest, filteredPullRequest] =
            normalizeGitHubPullRequests([
                {
                    baseRefName: "main",
                    headRefName: "empty",
                    isDraft: false,
                    number: 1,
                    state: "OPEN",
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
                    state: "CLOSED",
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

    test.each([
        { isDraft: false, state: "OPEN" },
        { isDraft: true, state: "OPEN" },
        { isDraft: false, state: "CLOSED" },
        { isDraft: false, state: "MERGED" },
    ] as const)(
        "normalizes $state with draft=$isDraft",
        ({ state, isDraft }) => {
            const [pullRequest] = normalizeGitHubPullRequests([
                {
                    baseRefName: "main",
                    headRefName: `${state.toLowerCase()}-${String(isDraft)}`,
                    isDraft,
                    number: 10,
                    state,
                    title: `${state} pull request`,
                    url: "https://github.com/example/repository/pull/10",
                },
            ]);

            expect(pullRequest).toMatchObject({ isDraft, state });
        },
    );

    test("rejects missing and unsupported PR states", () => {
        const pullRequests = normalizeGitHubPullRequests([
            {
                baseRefName: "main",
                headRefName: "missing-state",
                number: 1,
                title: "Missing state",
                url: "https://github.com/example/repository/pull/1",
            },
            {
                baseRefName: "main",
                headRefName: "unsupported-state",
                number: 2,
                state: "UNKNOWN",
                title: "Unsupported state",
                url: "https://github.com/example/repository/pull/2",
            },
        ]);

        expect(pullRequests).toEqual([]);
    });
});
