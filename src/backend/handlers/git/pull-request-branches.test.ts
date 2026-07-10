import { describe, expect, test } from "bun:test";

import type { GitHubPullRequest } from "@/backend/handlers/git/github";
import { pullRequestBranchHandler } from "@/backend/handlers/git/pull-request-branches";
import type { WorktreeInventory } from "@/backend/handlers/git/worktree-inventory";
import type { BranchInfo } from "@/backend/types";

const project = {
    id: "project",
    name: "Project",
    path: "/workspace/project",
};
const repository = {
    nameWithOwner: "example/project",
    url: "https://github.com/example/project",
};

const branch = (
    name: string,
    overrides: Partial<BranchInfo> = {},
): BranchInfo => ({
    hasWorktree: false,
    isStale: false,
    lastCommitTimestamp: 100,
    name,
    remoteName: `origin/${name}`,
    source: "branch",
    worktreePath: `/workspace/project/.pr-run/${name}`,
    ...overrides,
});

const pullRequest = (
    branchName: string,
    overrides: Partial<GitHubPullRequest> = {},
): GitHubPullRequest => ({
    additions: 0,
    assignees: [],
    baseBranchName: "main",
    branchName,
    changedFiles: 0,
    deletions: 0,
    isDraft: false,
    latestReviews: [],
    number: 1,
    reviewRequests: [],
    state: "OPEN",
    title: `PR for ${branchName}`,
    updatedAt: "2026-07-10T12:00:00Z",
    url: `https://github.com/example/project/pull/1`,
    ...overrides,
});

const inventory = (
    records: Array<{ branch: string; path: string }> = [],
): WorktreeInventory => ({
    byBranch: new Map(records.map((record) => [record.branch, record])),
    worktrees: records,
});

function merge(
    branches: BranchInfo[],
    pullRequests: GitHubPullRequest[],
    worktreeInventory = inventory(),
) {
    return pullRequestBranchHandler.mergeWithBranches({
        branches,
        inventory: worktreeInventory,
        project,
        pullRequests,
        repository,
    });
}

describe("pullRequestBranchHandler.mergeWithBranches", () => {
    test("replaces a matching branch with an open PR", () => {
        const [result] = merge(
            [branch("feature", { isStale: true })],
            [pullRequest("feature")],
        );

        expect(result).toMatchObject({
            isStale: false,
            name: "feature",
            source: "pull-request",
            pullRequest: { state: "OPEN" },
        });
        expect(result?.lastCommitTimestamp).toBe(
            Date.parse("2026-07-10T12:00:00Z"),
        );
    });

    test("keeps an open PR when its remote branch is missing", () => {
        const [result] = merge(
            [],
            [pullRequest("fork-feature")],
            inventory([
                {
                    branch: "fork-feature",
                    path: "/workspace/fork-feature",
                },
            ]),
        );

        expect(result).toMatchObject({
            hasWorktree: true,
            name: "fork-feature",
            remoteName: "origin/fork-feature",
            worktreePath: "/workspace/fork-feature",
        });
    });

    test.each(["CLOSED", "MERGED"] as const)(
        "enriches an existing branch with a %s PR and preserves branch state",
        (state) => {
            const existingBranch = branch("historical", {
                hasWorktree: true,
                isStale: true,
                lastCommitTimestamp: 123,
                worktreePath: "/workspace/historical",
            });
            const [result] = merge(
                [existingBranch],
                [pullRequest("historical", { state })],
            );

            expect(result).toMatchObject({
                hasWorktree: true,
                isStale: true,
                lastCommitTimestamp: 123,
                pullRequest: { state },
                source: "pull-request",
                worktreePath: "/workspace/historical",
            });
        },
    );

    test("excludes historical PRs without remote branches", () => {
        const result = merge([], [pullRequest("deleted", { state: "MERGED" })]);

        expect(result).toEqual([]);
    });

    test("prefers an open PR over newer historical PRs", () => {
        const [result] = merge(
            [branch("reused")],
            [
                pullRequest("reused", {
                    number: 2,
                    state: "MERGED",
                    updatedAt: "2026-07-11T12:00:00Z",
                }),
                pullRequest("reused", {
                    number: 1,
                    state: "OPEN",
                    updatedAt: "2026-07-10T12:00:00Z",
                }),
            ],
        );

        expect(result?.pullRequest).toMatchObject({ number: 1, state: "OPEN" });
    });

    test("uses the latest historical PR when no open PR exists", () => {
        const [result] = merge(
            [branch("reused")],
            [
                pullRequest("reused", {
                    number: 1,
                    state: "MERGED",
                    updatedAt: "2026-07-09T12:00:00Z",
                }),
                pullRequest("reused", {
                    number: 2,
                    state: "CLOSED",
                    updatedAt: "2026-07-10T12:00:00Z",
                }),
            ],
        );

        expect(result?.pullRequest).toMatchObject({
            number: 2,
            state: "CLOSED",
        });
    });
});
