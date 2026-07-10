import { describe, expect, test } from "bun:test";

import {
    closeWorkspaceTab,
    cycleWorkspaceTabs,
    getWorktreeTabId,
} from "@/lib/hooks/store/use-workspace-tabs-store";

const tabs = [
    {
        branchName: "first",
        id: getWorktreeTabId("one", "first"),
        projectId: "one",
        projectName: "One",
    },
    {
        branchName: "second",
        id: getWorktreeTabId("two", "second"),
        projectId: "two",
        projectName: "Two",
    },
    {
        branchName: "third",
        id: getWorktreeTabId("three", "third"),
        projectId: "three",
        projectName: "Three",
    },
];

describe("workspace tab state", () => {
    test("prefers the next tab when closing the active tab", () => {
        const result = closeWorkspaceTab(
            { activeTabId: tabs[1]!.id, tabs },
            tabs[1]!.id,
        );

        expect(result.tabs.map((tab) => tab.branchName)).toEqual([
            "first",
            "third",
        ]);
        expect(result.activeTabId).toBe(tabs[2]!.id);
    });

    test("cycles across the beginning and end of the tab list", () => {
        const state = { activeTabId: tabs[0]!.id, tabs };

        expect(cycleWorkspaceTabs(state, "previous")).toBe(tabs[2]!.id);
        expect(cycleWorkspaceTabs(state, "next")).toBe(tabs[1]!.id);
    });
});
