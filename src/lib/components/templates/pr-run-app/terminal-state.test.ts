import { describe, expect, test } from "vitest";

import {
    getActiveOwnerTerminalKey,
    getPreferredGlobalTerminalKey,
    terminalPanelSize,
} from "@/lib/components/templates/pr-run-app/terminal-state";
import type { WorktreeTerminalOwnerState } from "@/lib/hooks/store/use-worktree-terminal-store";

describe("terminal panel selection", () => {
    test("prefers a busy live terminal and resolves the active owner tab", () => {
        const owners = {
            first: owner("first-tab", [
                tab("first-tab", "idle"),
                tab("busy-tab", "busy"),
            ]),
            second: owner("second-tab", [tab("second-tab", "idle")]),
        };

        expect(getPreferredGlobalTerminalKey(owners)).toBe("first::busy-tab");
        expect(getActiveOwnerTerminalKey(owners, "second")).toBe(
            "second::second-tab",
        );
    });

    test("falls back to the first terminal and handles missing owners", () => {
        const owners = {
            first: owner("first-tab", [tab("first-tab", "idle")]),
        };

        expect(getPreferredGlobalTerminalKey(owners)).toBe("first::first-tab");
        expect(getActiveOwnerTerminalKey(owners, "missing")).toBeNull();
    });
});

describe("terminal panel sizing", () => {
    test("normalizes stored panel sizes", () => {
        expect(terminalPanelSize.initialHeight(null)).toBe(320);
        expect(terminalPanelSize.initialHeight(100)).toBe(180);
        expect(terminalPanelSize.initialSidebarWidth(null)).toBe(180);
        expect(terminalPanelSize.initialSidebarWidth(80)).toBe(132);
        expect(terminalPanelSize.initialSidebarWidth(500)).toBe(360);
    });

    test("clamps panel and sidebar drag transitions", () => {
        expect(terminalPanelSize.resizeHeight(320, 500, 450)).toBe(370);
        expect(terminalPanelSize.resizeHeight(200, 500, 700)).toBe(180);
        expect(terminalPanelSize.resizeSidebarWidth(180, 500, 450)).toBe(230);
        expect(terminalPanelSize.resizeSidebarWidth(180, 500, 900)).toBe(132);
        expect(terminalPanelSize.resizeSidebarWidth(300, 500, 200)).toBe(360);
    });
});

function owner(
    activeTabId: string,
    tabs: WorktreeTerminalOwnerState["tabs"],
): WorktreeTerminalOwnerState {
    return {
        activeTabId,
        defaultTerminalState: "idle",
        nextScriptLabelCounts: {},
        nextTerminalNumber: tabs.length + 1,
        tabs,
        worktreePath: "/workspace",
    };
}

function tab(
    id: string,
    busyState: "busy" | "idle",
): WorktreeTerminalOwnerState["tabs"][number] {
    return {
        busyState,
        hasManualInput: false,
        id,
        label: id,
        sessionId: `session-${id}`,
        shellName: "zsh",
        status: "alive",
    };
}
