import { describe, expect, test } from "vitest";

import {
    selectGlobalTerminal,
    type TerminalTreeTab,
} from "@/lib/components/templates/global-terminal-panel/terminal-selection";

function terminal(ownerKey: string, id: string): TerminalTreeTab {
    return {
        branchName: ownerKey,
        busyState: "idle",
        id,
        isAlive: true,
        label: id,
        ownerKey,
        projectId: "project",
        sessionId: id,
        terminalKey: `${ownerKey}:${id}`,
    };
}

describe("selectGlobalTerminal", () => {
    test("never reuses a selected terminal from another preferred owner", () => {
        const first = terminal("first", "one");
        const second = terminal("second", "two");

        expect(
            selectGlobalTerminal([first, second], "second", first.terminalKey),
        ).toBe(second);
        expect(
            selectGlobalTerminal([first], "second", first.terminalKey),
        ).toBeNull();
    });
});
