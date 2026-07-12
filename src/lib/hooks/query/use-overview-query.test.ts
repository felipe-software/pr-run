import { describe, expect, test } from "bun:test";

import { normalizeOverviewSnapshot } from "@/lib/hooks/query/use-overview-query";
import type { OverviewSnapshot } from "@/types/overview";

describe("normalizeOverviewSnapshot", () => {
    test("fills fields missing from a legacy persisted snapshot", () => {
        const legacySnapshot = {
            generatedAt: "2026-07-12T10:00:00.000Z",
            projects: [],
            pullRequests: [],
            scope: { type: "all" },
            totals: {
                additions: 0,
                branches: 0,
                changedFiles: 0,
                deletions: 0,
                openPullRequests: 0,
                staleBranches: 0,
                worktrees: 0,
            },
            unavailableProjects: [],
        } as unknown as OverviewSnapshot;

        expect(
            normalizeOverviewSnapshot(legacySnapshot).recentPullRequests,
        ).toEqual([]);
    });

    test("preserves recent pull requests from current snapshots", () => {
        const recentPullRequests = [{ number: 42 }];
        const snapshot = {
            recentPullRequests,
        } as unknown as OverviewSnapshot;

        expect(normalizeOverviewSnapshot(snapshot).recentPullRequests).toBe(
            recentPullRequests,
        );
    });
});
