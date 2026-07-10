import { describe, expect, test } from "bun:test";

import { getSidebarItemStatus } from "@/lib/components/templates/sidebar/sidebar-item-status";
import type { BranchInfo, PullRequestState } from "@/types/pr-run";

const branch = (overrides: Partial<BranchInfo> = {}): BranchInfo => ({
    hasWorktree: false,
    isStale: false,
    lastCommitTimestamp: 0,
    name: "feature",
    remoteName: "origin/feature",
    source: "branch",
    worktreePath: "/workspace/feature",
    ...overrides,
});

const pullRequestBranch = (
    state: PullRequestState,
    overrides: Partial<BranchInfo> = {},
) =>
    branch({
        hasWorktree: true,
        isStale: true,
        pullRequest: {
            assignees: [],
            baseBranchName: "main",
            isDraft: false,
            latestReviews: [],
            number: 1,
            reviewRequests: [],
            state,
            title: "Feature",
            url: "https://github.com/example/project/pull/1",
        },
        source: "pull-request",
        ...overrides,
    });

describe("getSidebarItemStatus", () => {
    test.each([
        ["OPEN", "open", "Open"],
        ["CLOSED", "closed", "Closed"],
        ["MERGED", "merged", "Merged"],
    ] as const)(
        "classifies a %s PR before worktree and stale state",
        (state, status, label) => {
            expect(
                getSidebarItemStatus(pullRequestBranch(state)),
            ).toMatchObject({
                label,
                status,
            });
        },
    );

    test("classifies an open draft PR as Draft", () => {
        const item = pullRequestBranch("OPEN");
        item.pullRequest!.isDraft = true;

        expect(getSidebarItemStatus(item)).toMatchObject({
            label: "Draft",
            status: "draft",
        });
    });

    test("ignores draft metadata after a PR closes", () => {
        const item = pullRequestBranch("CLOSED");
        item.pullRequest!.isDraft = true;

        expect(getSidebarItemStatus(item)).toMatchObject({
            label: "Closed",
            status: "closed",
        });
    });

    test("classifies a normal worktree as Branch", () => {
        expect(
            getSidebarItemStatus(branch({ hasWorktree: true })),
        ).toMatchObject({ label: "Branch", status: "branch" });
    });

    test("classifies a stale normal worktree as Stale", () => {
        expect(
            getSidebarItemStatus(branch({ hasWorktree: true, isStale: true })),
        ).toMatchObject({ label: "Stale", status: "stale" });
    });
});
