import { describe, expect, it } from "bun:test";

import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

import {
    getVisibleSidebarBranches,
    sortBranchesByLastCommit,
    sortProjectsByBusyState,
} from "./sidebar-sort";

describe("sortProjectsByBusyState", () => {
    it("promotes busy projects without changing relative order", () => {
        const projects = [
            createProject("project-a"),
            createProject("project-b"),
            createProject("project-c"),
            createProject("project-d"),
        ];

        expect(
            sortProjectsByBusyState(
                projects,
                new Set(["project-b", "project-d"]),
            ).map((project) => project.id),
        ).toEqual(["project-b", "project-d", "project-a", "project-c"]);
    });
});

describe("getVisibleSidebarBranches", () => {
    it("promotes busy branches before recent branches", () => {
        const branches = sortBranchesByLastCommit([
            createBranch("recent", 300),
            createBranch("busy", 100),
            createBranch("older", 200),
        ]);

        const result = getVisibleSidebarBranches({
            areAllRecentBranchesVisible: false,
            areStaleBranchesVisible: false,
            branches,
            busyOwnerKeys: new Set(["project-one:busy"]),
            initialVisibleBranchCount: 5,
            projectId: "project-one",
        });

        expect(result.visibleBranches.map((branch) => branch.name)).toEqual([
            "busy",
            "recent",
            "older",
        ]);
    });

    it("shows busy stale branches even when stale branches are collapsed", () => {
        const branches = sortBranchesByLastCommit([
            createBranch("recent", 300),
            createBranch("busy-stale", 100, { isStale: true }),
            createBranch("stale", 200, { isStale: true }),
        ]);

        const result = getVisibleSidebarBranches({
            areAllRecentBranchesVisible: false,
            areStaleBranchesVisible: false,
            branches,
            busyOwnerKeys: new Set(["project-one:busy-stale"]),
            initialVisibleBranchCount: 5,
            projectId: "project-one",
        });

        expect(result.visibleBranches.map((branch) => branch.name)).toEqual([
            "busy-stale",
            "recent",
        ]);
        expect(result.staleBranches.map((branch) => branch.name)).toEqual([
            "stale",
        ]);
    });

    it("keeps non-busy stale branches hidden until stale branches are expanded", () => {
        const branches = sortBranchesByLastCommit([
            createBranch("recent", 300),
            createBranch("stale", 200, { isStale: true }),
        ]);

        const collapsedResult = getVisibleSidebarBranches({
            areAllRecentBranchesVisible: false,
            areStaleBranchesVisible: false,
            branches,
            busyOwnerKeys: new Set(),
            initialVisibleBranchCount: 5,
            projectId: "project-one",
        });
        const expandedResult = getVisibleSidebarBranches({
            areAllRecentBranchesVisible: false,
            areStaleBranchesVisible: true,
            branches,
            busyOwnerKeys: new Set(),
            initialVisibleBranchCount: 5,
            projectId: "project-one",
        });

        expect(
            collapsedResult.visibleBranches.map((branch) => branch.name),
        ).toEqual(["recent"]);
        expect(
            expandedResult.visibleBranches.map((branch) => branch.name),
        ).toEqual(["recent", "stale"]);
    });
});

function createProject(id: string): ProjectConfig {
    return {
        id,
        name: id,
        path: `/tmp/${id}`,
    };
}

function createBranch(
    name: string,
    lastCommitTimestamp: number,
    options: Partial<BranchInfo> = {},
): BranchInfo {
    return {
        compareBranchName: "main",
        hasWorktree: true,
        isStale: false,
        lastCommitTimestamp,
        name,
        remoteName: `origin/${name}`,
        source: "branch",
        worktreePath: `/tmp/${name}`,
        ...options,
    };
}
