import { describe, expect, test } from "vitest";

import {
    compareActivityItems,
    partitionActivityCommits,
} from "@/backend/handlers/git/activity";
import type { CommitInfo, WorktreeActivityItem } from "@/backend/types";

describe("compareActivityItems", () => {
    test("sorts oldest activity first with stable ids", () => {
        const items = [
            { id: "b", occurredAt: "2026-07-10T00:00:00Z" },
            { id: "c", occurredAt: "2026-07-09T00:00:00Z" },
            { id: "a", occurredAt: "2026-07-10T00:00:00Z" },
        ] as WorktreeActivityItem[];

        expect(items.sort(compareActivityItems).map((item) => item.id)).toEqual(
            ["c", "a", "b"],
        );
    });
});

describe("partitionActivityCommits", () => {
    const commits = [
        commit("branch-head", false),
        commit("branch-parent", false),
        commit("base", false),
    ];

    test("uses pull request hashes even when the base already contains the branch", () => {
        const result = partitionActivityCommits(commits, [
            "branch-head",
            "branch-parent",
        ]);

        expect(result.branchItems.map((item) => item.id)).toEqual([
            "commit:branch-parent",
            "commit:branch-head",
        ]);
        expect(result.baseCommits.map((item) => item.hash)).toEqual(["base"]);
    });

    test("keeps the git classification when pull request hashes are unavailable", () => {
        const result = partitionActivityCommits([
            commit("branch", true),
            commit("base", false),
        ]);

        expect(result.branchItems.map((item) => item.id)).toEqual([
            "commit:branch",
        ]);
        expect(result.baseCommits.map((item) => item.hash)).toEqual(["base"]);
    });
});

function commit(hash: string, isInSelectedBranch: boolean): CommitInfo {
    return {
        authorEmail: "author@example.com",
        authorName: "Author",
        date: "2026-07-10T00:00:00Z",
        hash,
        isInSelectedBranch,
        shortHash: hash,
        subject: hash,
    };
}
