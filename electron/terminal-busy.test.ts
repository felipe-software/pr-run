import { describe, expect, it } from "bun:test";

import {
    classifyUnixTerminalBusyState,
    parseTerminalProcessRows,
} from "./terminal-busy";

describe("parseTerminalProcessRows", () => {
    it("parses valid ps rows", () => {
        expect(
            parseTerminalProcessRows(
                "123 123 123 Ss+ zsh\n456 456 123 S+ sleep",
            ),
        ).toEqual([
            {
                pid: 123,
                pgid: 123,
                tpgid: 123,
                stat: "Ss+",
                command: "zsh",
            },
            {
                pid: 456,
                pgid: 456,
                tpgid: 123,
                stat: "S+",
                command: "sleep",
            },
        ]);
    });

    it("returns null for invalid output", () => {
        expect(parseTerminalProcessRows("not a ps row")).toBeNull();
    });
});

describe("classifyUnixTerminalBusyState", () => {
    it("returns idle for a foreground shell with no extra foreground process", () => {
        const rows = parseTerminalProcessRows("100 100 100 Ss+ zsh");

        expect(rows).not.toBeNull();
        expect(
            classifyUnixTerminalBusyState({
                rows: rows!,
                shellPid: 100,
            }),
        ).toBe("idle");
    });

    it("returns busy when a foreground child process is attached", () => {
        const rows = parseTerminalProcessRows(
            "100 100 200 Ss zsh\n200 200 200 S+ sleep",
        );

        expect(rows).not.toBeNull();
        expect(
            classifyUnixTerminalBusyState({
                rows: rows!,
                shellPid: 100,
            }),
        ).toBe("busy");
    });

    it("returns busy when the shell is not the foreground process group", () => {
        const rows = parseTerminalProcessRows("100 100 200 Ss zsh");

        expect(rows).not.toBeNull();
        expect(
            classifyUnixTerminalBusyState({
                rows: rows!,
                shellPid: 100,
            }),
        ).toBe("busy");
    });

    it("returns busy when the shell row is missing", () => {
        const rows = parseTerminalProcessRows("200 200 200 S+ sleep");

        expect(rows).not.toBeNull();
        expect(
            classifyUnixTerminalBusyState({
                rows: rows!,
                shellPid: 100,
            }),
        ).toBe("busy");
    });
});
