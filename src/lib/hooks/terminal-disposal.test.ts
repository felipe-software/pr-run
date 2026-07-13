import { describe, expect, test, vi } from "vitest";

import {
    disposeTerminalTabs,
    TerminalDisposalError,
} from "@/lib/hooks/terminal-disposal";

const targets = [
    { sessionId: "session-1", tabId: "tab-1" },
    { sessionId: "session-2", tabId: "tab-2" },
    { sessionId: "session-3", tabId: "tab-3" },
];

describe("disposeTerminalTabs", () => {
    test("removes successful tabs while retaining and reporting failed sessions", async () => {
        const disposedTabIds: string[] = [];
        const disposeSession = vi.fn(async (sessionId: string) => {
            if (sessionId === "session-2") {
                throw new Error("backend unavailable");
            }
        });

        const rejection = disposeTerminalTabs(
            targets,
            disposeSession,
            (tabId) => disposedTabIds.push(tabId),
        );

        await expect(rejection).rejects.toMatchObject({
            failedSessionIds: ["session-2"],
            message: "Failed to dispose 1 of 3 terminal sessions: session-2",
            name: "TerminalDisposalError",
        } satisfies Partial<TerminalDisposalError>);
        expect(disposeSession).toHaveBeenCalledTimes(3);
        expect(disposedTabIds).toEqual(["tab-1", "tab-3"]);
    });

    test("reports success after every tab has been disposed", async () => {
        const disposedTabIds: string[] = [];

        await disposeTerminalTabs(
            targets,
            async () => undefined,
            (tabId) => disposedTabIds.push(tabId),
        );

        expect(disposedTabIds).toEqual(["tab-1", "tab-2", "tab-3"]);
    });
});
