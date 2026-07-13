import { describe, expect, test } from "vitest";

import { getSidebarBranchPendingAction } from "./sidebar-branch-action";

describe("getSidebarBranchPendingAction", () => {
    test("derives a checkout action for a branch without a worktree", () => {
        expect(
            getSidebarBranchPendingAction({
                branch: { hasWorktree: false, name: "feature" },
                pendingWorktreeCheckoutKey: "project-one:feature",
                projectId: "project-one",
            }),
        ).toEqual({ type: "checking-out" });
    });

    test("derives a removal action for a branch with a worktree", () => {
        expect(
            getSidebarBranchPendingAction({
                branch: { hasWorktree: true, name: "feature" },
                pendingWorktreeRemovalKey: "project-one:feature",
                projectId: "project-one",
            }),
        ).toEqual({ type: "removing" });
    });

    test("keeps unrelated and impossible actions idle", () => {
        expect(
            getSidebarBranchPendingAction({
                branch: { hasWorktree: true, name: "feature" },
                pendingWorktreeCheckoutKey: "project-one:feature",
                pendingWorktreeRemovalKey: "project-one:other",
                projectId: "project-one",
            }),
        ).toEqual({ type: "idle" });
    });
});
