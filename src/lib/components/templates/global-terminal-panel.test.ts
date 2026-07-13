import { describe, expect, test } from "vitest";

import {
    buildTerminalTree,
    flattenTerminalTree,
    getTerminalKey,
    selectGlobalTerminal,
    type TerminalTreeTab,
    toggleTerminalGroup,
} from "@/lib/components/templates/global-terminal-panel/terminal-selection";
import { createWorktreeTerminalOwnerState } from "@/lib/hooks/store/use-worktree-terminal-store";

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

    test("uses a selected terminal or the first terminal without a preferred owner", () => {
        const first = terminal("first", "one");
        const second = terminal("second", "two");

        expect(
            selectGlobalTerminal([first, second], null, second.terminalKey),
        ).toBe(second);
        expect(selectGlobalTerminal([first, second], null, "missing")).toBe(
            first,
        );
        expect(selectGlobalTerminal([], null, null)).toBeNull();
    });
});

describe("terminal tree", () => {
    test("builds, orders, and flattens terminal groups", () => {
        const emptyOwner = createWorktreeTerminalOwnerState("/tmp/empty");
        const appOwner = {
            ...createWorktreeTerminalOwnerState("/tmp/app"),
            tabs: [
                {
                    busyState: "busy" as const,
                    hasManualInput: false,
                    id: "app-tab",
                    label: "Build",
                    sessionId: "app-session",
                    shellName: "zsh",
                    status: "alive" as const,
                },
            ],
        };
        const unknownOwner = {
            ...createWorktreeTerminalOwnerState("/tmp/unknown"),
            tabs: [
                {
                    busyState: "idle" as const,
                    hasManualInput: false,
                    id: "unknown-tab",
                    label: "Terminal 1",
                    sessionId: "unknown-session",
                    shellName: "zsh",
                    status: "exited" as const,
                },
            ],
        };
        const tree = buildTerminalTree(
            [
                {
                    collapsed: false,
                    id: "group",
                    name: "Projects",
                    projects: [{ id: "app", name: "App", path: "/tmp/app" }],
                },
            ],
            {
                "app:feature": appOwner,
                empty: emptyOwner,
                orphan: unknownOwner,
            },
        );

        expect(tree.map((group) => group.title)).toEqual([
            "App - feature",
            "orphan - orphan",
        ]);
        expect(tree[0]).toMatchObject({ isBusy: true, projectId: "app" });
        expect(tree[1]).toMatchObject({
            branchName: "orphan",
            isBusy: false,
            projectId: "orphan",
        });
        expect(flattenTerminalTree(tree).map((tab) => tab.id)).toEqual([
            "app-tab",
            "unknown-tab",
        ]);
        expect(getTerminalKey("app:feature", "app-tab")).toBe(
            "app:feature::app-tab",
        );
    });

    test("labels the global home terminal", () => {
        const owner = {
            ...createWorktreeTerminalOwnerState("/tmp/home"),
            tabs: [
                {
                    busyState: "idle" as const,
                    hasManualInput: false,
                    id: "home",
                    label: "Home",
                    sessionId: "home",
                    shellName: "zsh",
                    status: "alive" as const,
                },
            ],
        };

        expect(buildTerminalTree([], { "global:home": owner })[0]?.title).toBe(
            "Home",
        );
    });

    test("toggles a group without mutating the source set", () => {
        const source = new Set(["one"]);
        const removed = toggleTerminalGroup(source, "one");
        const added = toggleTerminalGroup(source, "two");

        expect([...source]).toEqual(["one"]);
        expect([...removed]).toEqual([]);
        expect([...added]).toEqual(["one", "two"]);
    });
});
