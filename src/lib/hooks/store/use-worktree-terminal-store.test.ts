import { beforeEach, describe, expect, it } from "vitest";

import {
    appendWorktreeTerminalTab,
    createWorktreeTerminalOwnerState,
    getBusyTerminalSummary,
    removeWorktreeTerminalTab,
    resolveScriptExecutionMode,
    useWorktreeTerminalStore,
} from "./use-worktree-terminal-store";

beforeEach(() => {
    useWorktreeTerminalStore.setState({ owners: {} });
});

describe("resolveScriptExecutionMode", () => {
    it("reuses the active tab when the session is idle", () => {
        expect(
            resolveScriptExecutionMode({
                activeTab: {
                    busyState: "idle",
                    id: "tab-1",
                    label: "Terminal 1",
                    sessionId: "session-1",
                    status: "alive",
                    hasManualInput: false,
                    shellName: "zsh",
                },
                activeSessionState: {
                    isAlive: true,
                    busyState: "idle",
                },
            }),
        ).toBe("reuse");
    });

    it("creates a new tab when the active session is busy", () => {
        expect(
            resolveScriptExecutionMode({
                activeTab: {
                    busyState: "busy",
                    id: "tab-1",
                    label: "Terminal 1",
                    sessionId: "session-1",
                    status: "alive",
                    hasManualInput: false,
                    shellName: "zsh",
                },
                activeSessionState: {
                    isAlive: true,
                    busyState: "busy",
                },
            }),
        ).toBe("create");
    });
});

describe("worktree terminal owner state", () => {
    it("preserves tabs per owner", () => {
        const firstOwner = appendWorktreeTerminalTab(
            createWorktreeTerminalOwnerState("/tmp/one"),
            {
                busyState: "idle",
                id: "tab-1",
                label: "Terminal 1",
                sessionId: "session-1",
                status: "alive",
                hasManualInput: false,
                shellName: "zsh",
            },
        );
        const secondOwner = appendWorktreeTerminalTab(
            createWorktreeTerminalOwnerState("/tmp/two"),
            {
                busyState: "idle",
                id: "tab-2",
                label: "Terminal 1",
                sessionId: "session-2",
                status: "alive",
                hasManualInput: false,
                shellName: "zsh",
            },
        );

        expect(firstOwner.tabs.map((tab) => tab.id)).toEqual(["tab-1"]);
        expect(secondOwner.tabs.map((tab) => tab.id)).toEqual(["tab-2"]);
    });

    it("moves active selection to the previous neighbor when closing the active tab", () => {
        const owner = appendWorktreeTerminalTab(
            appendWorktreeTerminalTab(
                appendWorktreeTerminalTab(
                    createWorktreeTerminalOwnerState("/tmp/one"),
                    {
                        busyState: "idle",
                        id: "tab-1",
                        label: "Terminal 1",
                        sessionId: "session-1",
                        status: "alive",
                        hasManualInput: false,
                        shellName: "zsh",
                    },
                ),
                {
                    busyState: "idle",
                    id: "tab-2",
                    label: "Terminal 2",
                    sessionId: "session-2",
                    status: "alive",
                    hasManualInput: false,
                    shellName: "zsh",
                },
            ),
            {
                busyState: "idle",
                id: "tab-3",
                label: "Terminal 3",
                sessionId: "session-3",
                status: "alive",
                hasManualInput: false,
                shellName: "zsh",
            },
        );
        const nextOwner = removeWorktreeTerminalTab(owner, "tab-3");

        expect(nextOwner.activeTabId).toBe("tab-2");
        expect(nextOwner.tabs.map((tab) => tab.id)).toEqual(["tab-1", "tab-2"]);
    });
});

describe("getBusyTerminalSummary", () => {
    it("counts alive busy tabs across owners", () => {
        const summary = getBusyTerminalSummary({
            "project-one:feature-a": {
                ...createWorktreeTerminalOwnerState("/tmp/one"),
                tabs: [
                    createTab("tab-1", "busy", "alive"),
                    createTab("tab-2", "busy", "alive"),
                ],
            },
            "project-two:feature-b": {
                ...createWorktreeTerminalOwnerState("/tmp/two"),
                tabs: [createTab("tab-3", "busy", "alive")],
            },
        });

        expect(summary.busyTerminalCount).toBe(3);
        expect([...summary.busyOwnerKeys]).toEqual([
            "project-one:feature-a",
            "project-two:feature-b",
        ]);
        expect([...summary.busyProjectIds]).toEqual([
            "project-one",
            "project-two",
        ]);
    });

    it("ignores idle, unknown, and exited tabs", () => {
        const summary = getBusyTerminalSummary({
            "project-one:feature-a": {
                ...createWorktreeTerminalOwnerState("/tmp/one"),
                tabs: [
                    createTab("tab-1", "idle", "alive"),
                    createTab("tab-2", "unknown", "alive"),
                    createTab("tab-3", "busy", "exited"),
                ],
            },
            "project-two:feature-b": {
                ...createWorktreeTerminalOwnerState("/tmp/two"),
                tabs: [createTab("tab-4", "busy", "alive")],
            },
        });

        expect(summary.busyTerminalCount).toBe(1);
        expect([...summary.busyOwnerKeys]).toEqual(["project-two:feature-b"]);
        expect([...summary.busyProjectIds]).toEqual(["project-two"]);
    });
});

describe("terminal snapshot synchronization", () => {
    it("preserves every store reference for a semantic no-op", () => {
        const store = useWorktreeTerminalStore.getState();
        store.addSession(
            "project:branch",
            "/tmp/project",
            { type: "manual" },
            {
                busyState: "idle",
                currentProcess: "zsh",
                cwd: "/tmp/project",
                id: "session-1",
                isAlive: true,
                sequence: 0,
                shell: "zsh",
            },
        );
        store.syncTabSnapshot("project:branch", "session-1", {
            busyState: "idle",
            currentProcess: "zsh",
            id: "session-1",
            isAlive: true,
        });
        const previousState = useWorktreeTerminalStore.getState();
        const previousOwners = previousState.owners;
        const previousOwner = previousOwners["project:branch"];
        const previousTabs = previousOwner?.tabs;
        const previousTab = previousTabs?.[0];

        previousState.syncTabSnapshot("project:branch", "session-1", {
            busyState: "idle",
            currentProcess: "zsh",
            id: "session-1",
            isAlive: true,
        });

        const nextState = useWorktreeTerminalStore.getState();
        expect(nextState).toBe(previousState);
        expect(nextState.owners).toBe(previousOwners);
        expect(nextState.owners["project:branch"]).toBe(previousOwner);
        expect(nextState.owners["project:branch"]?.tabs).toBe(previousTabs);
        expect(nextState.owners["project:branch"]?.tabs[0]).toBe(previousTab);
    });

    it("changes only the synchronized owner when snapshot state changes", () => {
        const store = useWorktreeTerminalStore.getState();
        store.addSession(
            "project:first",
            "/tmp/first",
            { type: "manual" },
            {
                busyState: "idle",
                currentProcess: "zsh",
                cwd: "/tmp/first",
                id: "session-1",
                isAlive: true,
                sequence: 0,
                shell: "zsh",
            },
        );
        store.addSession(
            "project:second",
            "/tmp/second",
            { type: "manual" },
            {
                busyState: "idle",
                currentProcess: "zsh",
                cwd: "/tmp/second",
                id: "session-2",
                isAlive: true,
                sequence: 0,
                shell: "zsh",
            },
        );
        const previousState = useWorktreeTerminalStore.getState();
        const previousFirstOwner = previousState.owners["project:first"];
        const previousSecondOwner = previousState.owners["project:second"];

        previousState.syncTabSnapshot("project:first", "session-1", {
            busyState: "busy",
            currentProcess: "bun",
            id: "session-1",
            isAlive: true,
        });

        const nextState = useWorktreeTerminalStore.getState();
        expect(nextState).not.toBe(previousState);
        expect(nextState.owners["project:first"]).not.toBe(previousFirstOwner);
        expect(nextState.owners["project:second"]).toBe(previousSecondOwner);
        expect(nextState.owners["project:first"]?.tabs[0]).toMatchObject({
            busyState: "busy",
            label: "bun",
        });
    });
});

function createTab(
    id: string,
    busyState: "busy" | "idle" | "unknown",
    status: "alive" | "exited",
) {
    return {
        busyState,
        id,
        label: id,
        sessionId: id,
        status,
        hasManualInput: false,
        shellName: "zsh",
    };
}
