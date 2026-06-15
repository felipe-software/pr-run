import { describe, expect, it } from "bun:test";

import {
    appendWorktreeTerminalTab,
    createWorktreeTerminalOwnerState,
    removeWorktreeTerminalTab,
    resolveScriptExecutionMode,
} from "./use-worktree-terminal-store";

describe("resolveScriptExecutionMode", () => {
    it("reuses the active tab when the session is idle", () => {
        expect(
            resolveScriptExecutionMode({
                activeTab: {
                    id: "tab-1",
                    label: "Terminal 1",
                    sessionId: "session-1",
                    status: "alive",
                    hasManualInput: false,
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
                    id: "tab-1",
                    label: "Terminal 1",
                    sessionId: "session-1",
                    status: "alive",
                    hasManualInput: false,
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
                id: "tab-1",
                label: "Terminal 1",
                sessionId: "session-1",
                status: "alive",
                hasManualInput: false,
            },
        );
        const secondOwner = appendWorktreeTerminalTab(
            createWorktreeTerminalOwnerState("/tmp/two"),
            {
                id: "tab-2",
                label: "Terminal 1",
                sessionId: "session-2",
                status: "alive",
                hasManualInput: false,
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
                        id: "tab-1",
                        label: "Terminal 1",
                        sessionId: "session-1",
                        status: "alive",
                        hasManualInput: false,
                    },
                ),
                {
                    id: "tab-2",
                    label: "Terminal 2",
                    sessionId: "session-2",
                    status: "alive",
                    hasManualInput: false,
                },
            ),
            {
                id: "tab-3",
                label: "Terminal 3",
                sessionId: "session-3",
                status: "alive",
                hasManualInput: false,
            },
        );
        const nextOwner = removeWorktreeTerminalTab(owner, "tab-3");

        expect(nextOwner.activeTabId).toBe("tab-2");
        expect(nextOwner.tabs.map((tab) => tab.id)).toEqual(["tab-1", "tab-2"]);
    });
});
