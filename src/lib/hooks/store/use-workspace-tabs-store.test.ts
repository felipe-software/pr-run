import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    closeWorkspaceTab,
    cycleWorkspaceTabs,
    getWorktreeTabId,
    reorderWorkspaceTabs,
    useWorkspaceTabsStore,
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

const localStorage = {
    getItem: vi.fn<() => string | null>(() => null),
    setItem: vi.fn(),
};
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

beforeEach(() => {
    localStorage.getItem.mockReset();
    localStorage.setItem.mockReset();
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: { localStorage },
    });
    useWorkspaceTabsStore.setState({ activeTabId: null, tabs: [] });
});

afterEach(() => {
    if (originalWindow) {
        Object.defineProperty(globalThis, "window", originalWindow);
    } else {
        Reflect.deleteProperty(globalThis, "window");
    }
});

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

    test("keeps an inactive selection and falls back to the previous tab", () => {
        expect(
            closeWorkspaceTab({ activeTabId: tabs[0]!.id, tabs }, tabs[2]!.id)
                .activeTabId,
        ).toBe(tabs[0]!.id);
        expect(
            closeWorkspaceTab({ activeTabId: tabs[2]!.id, tabs }, tabs[2]!.id)
                .activeTabId,
        ).toBe(tabs[1]!.id);
        expect(
            closeWorkspaceTab(
                { activeTabId: tabs[0]!.id, tabs: [tabs[0]!] },
                tabs[0]!.id,
            ),
        ).toEqual({ activeTabId: null, tabs: [] });
    });

    test("returns the same state when the tab does not exist", () => {
        const state = { activeTabId: tabs[0]!.id, tabs };

        expect(closeWorkspaceTab(state, "missing")).toBe(state);
    });

    test("cycles across the beginning and end of the tab list", () => {
        const state = { activeTabId: tabs[0]!.id, tabs };

        expect(cycleWorkspaceTabs(state, "previous")).toBe(tabs[2]!.id);
        expect(cycleWorkspaceTabs(state, "next")).toBe(tabs[1]!.id);
    });

    test("handles empty tabs and a missing active tab", () => {
        expect(
            cycleWorkspaceTabs({ activeTabId: null, tabs: [] }, "next"),
        ).toBeNull();
        expect(
            cycleWorkspaceTabs({ activeTabId: "missing", tabs }, "previous"),
        ).toBe(tabs[2]!.id);
    });

    test("reorders tabs around a drop target", () => {
        expect(
            reorderWorkspaceTabs(tabs, tabs[2]!.id, tabs[0]!.id).map(
                (tab) => tab.branchName,
            ),
        ).toEqual(["third", "first", "second"]);
    });

    test("preserves the list for invalid or identical reorder targets", () => {
        expect(reorderWorkspaceTabs(tabs, "missing", tabs[0]!.id)).toBe(tabs);
        expect(reorderWorkspaceTabs(tabs, tabs[0]!.id, "missing")).toBe(tabs);
        expect(reorderWorkspaceTabs(tabs, tabs[0]!.id, tabs[0]!.id)).toBe(tabs);
    });

    test("opens, refreshes, activates, cycles, and closes tabs through the store", () => {
        const store = useWorkspaceTabsStore.getState();

        store.openTab({
            branchName: "first",
            projectId: "one",
            projectName: "Old name",
        });
        useWorkspaceTabsStore.getState().openTab({
            branchName: "second",
            projectId: "two",
            projectName: "Two",
        });
        useWorkspaceTabsStore.getState().openTab({
            branchName: "first",
            projectId: "one",
            projectName: "One",
        });

        expect(useWorkspaceTabsStore.getState()).toMatchObject({
            activeTabId: tabs[0]!.id,
            tabs: [tabs[0], tabs[1]],
        });

        useWorkspaceTabsStore.getState().activateTab("missing");
        expect(useWorkspaceTabsStore.getState().activeTabId).toBe(tabs[0]!.id);
        useWorkspaceTabsStore.getState().activateTab(tabs[1]!.id);
        useWorkspaceTabsStore.getState().cycleTabs("next");
        expect(useWorkspaceTabsStore.getState().activeTabId).toBe(tabs[0]!.id);

        useWorkspaceTabsStore.getState().closeTab(tabs[0]!.id);
        expect(useWorkspaceTabsStore.getState()).toMatchObject({
            activeTabId: tabs[1]!.id,
            tabs: [tabs[1]],
        });
        expect(localStorage.setItem).toHaveBeenCalled();
    });

    test("prunes and reorders store tabs while preserving the active tab", () => {
        useWorkspaceTabsStore.setState({ activeTabId: tabs[1]!.id, tabs });

        useWorkspaceTabsStore
            .getState()
            .pruneTabs(new Set([tabs[0]!.id, tabs[2]!.id]));
        expect(useWorkspaceTabsStore.getState()).toMatchObject({
            activeTabId: tabs[0]!.id,
            tabs: [tabs[0], tabs[2]],
        });

        useWorkspaceTabsStore.getState().reorderTab(tabs[2]!.id, tabs[0]!.id);
        expect(
            useWorkspaceTabsStore.getState().tabs.map((tab) => tab.id),
        ).toEqual([tabs[2]!.id, tabs[0]!.id]);

        const previous = useWorkspaceTabsStore.getState();
        previous.reorderTab("missing", tabs[0]!.id);
        expect(useWorkspaceTabsStore.getState()).toBe(previous);
    });
});
