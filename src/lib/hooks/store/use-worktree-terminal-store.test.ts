import { describe, expect, it } from "bun:test";

import {
    appendWorktreeTerminalTab,
    createWorktreeTerminalOwnerState,
    getBusyTerminalSummary,
    removeWorktreeTerminalTab,
    resolveScriptExecutionMode,
} from "./use-worktree-terminal-store";

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
