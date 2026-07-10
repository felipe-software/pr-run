import { describe, expect, test } from "bun:test";

import { getSidebarPullRequestPeople } from "@/lib/components/templates/sidebar/sidebar-pr-people";
import type {
    GitHubUserInfo,
    PullRequestInfo,
    PullRequestReviewState,
} from "@/types/pr-run";

const user = (login: string): GitHubUserInfo => ({
    avatarUrl: `https://github.com/${login}.png`,
    login,
    url: `https://github.com/${login}`,
});

const pullRequest = (
    overrides: Partial<PullRequestInfo> = {},
): PullRequestInfo => ({
    assignees: [],
    author: user("author"),
    baseBranchName: "main",
    latestReviews: [],
    number: 42,
    reviewRequests: [],
    title: "Sidebar identity",
    url: "https://github.com/example/repository/pull/42",
    ...overrides,
});

describe("getSidebarPullRequestPeople", () => {
    test("merges people and prioritizes requested reviews over other roles", () => {
        const summary = getSidebarPullRequestPeople(
            pullRequest({
                assignees: [user("requested"), user("assigned")],
                latestReviews: [
                    { author: user("requested"), state: "APPROVED" },
                    { author: user("reviewed"), state: "COMMENTED" },
                ],
                reviewRequests: [user("requested")],
            }),
        );

        expect(summary).toEqual({
            overflowCount: 0,
            people: [
                {
                    roleLabel: "Review requested, assignee",
                    user: user("requested"),
                },
                { roleLabel: "Commented", user: user("reviewed") },
                { roleLabel: "Assignee", user: user("assigned") },
            ],
        });
    });

    test("excludes the author from related people", () => {
        const summary = getSidebarPullRequestPeople(
            pullRequest({
                assignees: [user("author")],
                latestReviews: [{ author: user("author"), state: "APPROVED" }],
                reviewRequests: [user("author")],
            }),
        );

        expect(summary.people).toEqual([]);
    });

    test.each([
        ["APPROVED", "Approved"],
        ["CHANGES_REQUESTED", "Changes requested"],
        ["COMMENTED", "Commented"],
        ["DISMISSED", "Dismissed"],
        ["PENDING", "Pending"],
    ] as [PullRequestReviewState, string][])(
        "labels the %s review state",
        (state, expectedLabel) => {
            const summary = getSidebarPullRequestPeople(
                pullRequest({
                    latestReviews: [{ author: user("reviewer"), state }],
                }),
            );

            expect(summary.people[0]?.roleLabel).toBe(expectedLabel);
        },
    );

    test("caps visible people and reports overflow", () => {
        const summary = getSidebarPullRequestPeople(
            pullRequest({
                reviewRequests: [
                    user("one"),
                    user("two"),
                    user("three"),
                    user("four"),
                    user("five"),
                    user("six"),
                ],
            }),
        );

        expect(summary.people.map((person) => person.user.login)).toEqual([
            "one",
            "two",
            "three",
            "four",
        ]);
        expect(summary.overflowCount).toBe(2);
    });
});
