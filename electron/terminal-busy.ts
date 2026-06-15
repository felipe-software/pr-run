import { execFile } from "node:child_process";

import type { TerminalBusyState } from "./types.js";

export type TerminalProcessRow = {
    pid: number;
    pgid: number;
    tpgid: number;
    stat: string;
    command: string;
};

export function parseTerminalProcessRows(
    output: string,
): TerminalProcessRow[] | null {
    const rows = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);

            if (!match) {
                return null;
            }

            return {
                pid: Number(match[1]),
                pgid: Number(match[2]),
                tpgid: Number(match[3]),
                stat: match[4],
                command: match[5],
            } satisfies TerminalProcessRow;
        });

    if (!rows.length || rows.some((row) => row === null)) {
        return null;
    }

    return rows.filter((row): row is TerminalProcessRow => row !== null);
}

export function classifyUnixTerminalBusyState(params: {
    rows: TerminalProcessRow[];
    shellPid: number;
}): TerminalBusyState {
    const shellRow = params.rows.find((row) => row.pid === params.shellPid);

    if (!shellRow) {
        return "busy";
    }

    if (shellRow.pgid !== shellRow.tpgid) {
        return "busy";
    }

    const foregroundGroupRows = params.rows.filter(
        (row) => row.pgid === shellRow.tpgid,
    );

    if (foregroundGroupRows.length !== 1) {
        return "busy";
    }

    return foregroundGroupRows[0]?.pid === params.shellPid ? "idle" : "busy";
}

export async function getUnixTerminalBusyState(params: {
    shellPid: number;
    unixPtsName?: string;
}): Promise<TerminalBusyState> {
    if (!params.unixPtsName) {
        return "busy";
    }

    const terminalName = params.unixPtsName.replace(/^\/dev\//, "");
    const [error, output] = await runPs(terminalName);

    if (error) {
        return "busy";
    }

    const rows = parseTerminalProcessRows(output);

    if (!rows) {
        return "busy";
    }

    return classifyUnixTerminalBusyState({
        rows,
        shellPid: params.shellPid,
    });
}

function runPs(terminalName: string): Promise<[Error | null, string]> {
    return new Promise((resolve) => {
        execFile(
            "ps",
            ["-o", "pid=,pgid=,tpgid=,stat=,comm=", "-t", terminalName],
            (error, stdout) => {
                if (error) {
                    resolve([error, ""]);
                    return;
                }

                resolve([null, stdout]);
            },
        );
    });
}
