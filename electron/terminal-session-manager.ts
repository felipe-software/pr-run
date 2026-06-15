import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { type WebContents, webContents } from "electron";
import * as pty from "node-pty";

import { getUnixTerminalBusyState } from "./terminal-busy.js";
import type {
    TerminalBusyState,
    TerminalCreateOptions,
    TerminalDataEvent,
    TerminalExitEvent,
    TerminalInputOptions,
    TerminalSession,
    TerminalSessionSnapshot,
} from "./types.js";

const MAX_HISTORY_BYTES = 1024 * 1024;
const DEFAULT_WINDOWS_SHELL = "cmd.exe";
const WINDOWS_POLL_INTERVAL_MS = 500;

type TerminalSessionRecord = {
    id: string;
    process: pty.IPty;
    webContentsId: number;
    shell: string;
    cwd: string;
    history: Buffer;
    sequence: number;
    exitState?: {
        exitCode: number;
        signal?: number;
    };
    unixPtsName?: string;
    windowsBusyState: TerminalBusyState;
    windowsBusyPollTimeout: NodeJS.Timeout | null;
};

export class TerminalSessionManager {
    private readonly terminalSessions = new Map<
        string,
        TerminalSessionRecord
    >();
    private readonly trackedWebContentsIds = new Set<number>();

    createSession(
        sender: WebContents,
        options: TerminalCreateOptions,
    ): TerminalSession {
        const cwd = path.resolve(options.cwd);
        const stat = fs.statSync(cwd);

        if (!stat.isDirectory()) {
            throw new Error("Terminal cwd must be a directory.");
        }

        this.trackWebContents(sender);

        const shellPath = defaultShell();
        const env = Object.fromEntries(
            Object.entries(process.env).filter(
                (entry): entry is [string, string] =>
                    typeof entry[1] === "string",
            ),
        );
        const terminalProcess = pty.spawn(shellPath, [], {
            name: "xterm-256color",
            cwd,
            cols: Math.max(2, options.cols),
            rows: Math.max(2, options.rows),
            env: {
                ...env,
                TERM: "xterm-256color",
                COLORTERM: "truecolor",
            },
        });
        const id = crypto.randomUUID();
        const session: TerminalSessionRecord = {
            id,
            process: terminalProcess,
            webContentsId: sender.id,
            shell: shellPath,
            cwd,
            history: Buffer.alloc(0),
            sequence: 0,
            unixPtsName: readUnixPtsName(terminalProcess),
            windowsBusyPollTimeout: null,
            windowsBusyState: "idle",
        };

        terminalProcess.onData((data) => {
            this.handleProcessData(session.id, data);
        });
        terminalProcess.onExit(({ exitCode, signal }) => {
            this.handleProcessExit(session.id, { exitCode, signal });
        });

        this.terminalSessions.set(id, session);

        return this.toTerminalSession(session, "idle");
    }

    async getSessionSnapshot(
        sender: WebContents,
        id: string,
    ): Promise<TerminalSessionSnapshot> {
        const session = this.getSessionOrThrow(sender.id, id);
        const busyState = await this.getBusyState(session);

        return {
            id: session.id,
            shell: session.shell,
            cwd: session.cwd,
            currentProcess: getCurrentProcessName(session),
            isAlive: !session.exitState,
            busyState,
            sequence: session.sequence,
            history: session.history.toString("utf8"),
            exitCode: session.exitState?.exitCode,
            signal: session.exitState?.signal,
        };
    }

    async getSessionState(sender: WebContents, id: string) {
        const session = this.getSessionOrThrow(sender.id, id);
        const busyState = await this.getBusyState(session);

        return {
            id: session.id,
            currentProcess: getCurrentProcessName(session),
            isAlive: !session.exitState,
            busyState,
            sequence: session.sequence,
        };
    }

    writeInput(
        sender: WebContents,
        id: string,
        data: string,
        options?: TerminalInputOptions,
    ) {
        const session = this.getSessionOrThrow(sender.id, id);

        if (session.exitState) {
            throw new Error("Terminal session has already exited.");
        }

        if (process.platform === "win32") {
            this.updateWindowsBusyState(session, options);
        }

        session.process.write(data);
    }

    resizeSession(sender: WebContents, id: string, cols: number, rows: number) {
        const session = this.getSessionOrThrow(sender.id, id);
        session.process.resize(Math.max(2, cols), Math.max(2, rows));
    }

    disposeSession(sender: WebContents, id: string) {
        const session = this.getSessionOrThrow(sender.id, id);
        this.closeTerminalSession(session.id);
    }

    closeWebContentsSessions(webContentsId: number) {
        for (const [id, session] of this.terminalSessions) {
            if (session.webContentsId === webContentsId) {
                this.closeTerminalSession(id);
            }
        }
    }

    disposeAll() {
        for (const id of this.terminalSessions.keys()) {
            this.closeTerminalSession(id);
        }
    }

    private trackWebContents(sender: WebContents) {
        if (this.trackedWebContentsIds.has(sender.id)) {
            return;
        }

        this.trackedWebContentsIds.add(sender.id);
        sender.once("destroyed", () => {
            this.trackedWebContentsIds.delete(sender.id);
            this.closeWebContentsSessions(sender.id);
        });
    }

    private getSessionOrThrow(webContentsId: number, id: string) {
        const session = this.terminalSessions.get(id);

        if (!session || session.webContentsId !== webContentsId) {
            throw new Error("Terminal session was not found.");
        }

        return session;
    }

    private closeTerminalSession(id: string) {
        const session = this.terminalSessions.get(id);

        if (!session) {
            return;
        }

        this.terminalSessions.delete(id);

        if (session.windowsBusyPollTimeout) {
            clearTimeout(session.windowsBusyPollTimeout);
            session.windowsBusyPollTimeout = null;
        }

        session.process.kill();
    }

    private handleProcessData(id: string, data: string) {
        const session = this.terminalSessions.get(id);

        if (!session) {
            return;
        }

        session.history = appendHistoryChunk(session.history, data);
        session.sequence += 1;
        this.sendToRenderer(session.webContentsId, "terminal:data", {
            id: session.id,
            data,
            currentProcess: getCurrentProcessName(session),
            sequence: session.sequence,
        } satisfies TerminalDataEvent);
    }

    private handleProcessExit(
        id: string,
        exitState: { exitCode: number; signal?: number },
    ) {
        const session = this.terminalSessions.get(id);

        if (!session) {
            return;
        }

        if (session.windowsBusyPollTimeout) {
            clearTimeout(session.windowsBusyPollTimeout);
            session.windowsBusyPollTimeout = null;
        }

        session.exitState = exitState;
        session.sequence += 1;
        this.sendToRenderer(session.webContentsId, "terminal:exit", {
            id: session.id,
            exitCode: exitState.exitCode,
            signal: exitState.signal,
            currentProcess: getCurrentProcessName(session),
            sequence: session.sequence,
        } satisfies TerminalExitEvent);
    }

    private sendToRenderer<T>(
        webContentsId: number,
        channel: "terminal:data" | "terminal:exit",
        payload: T,
    ) {
        const target = webContents.fromId(webContentsId);

        if (!target || target.isDestroyed()) {
            return;
        }

        target.send(channel, payload);
    }

    private async getBusyState(
        session: TerminalSessionRecord,
    ): Promise<TerminalBusyState> {
        if (session.exitState) {
            return "unknown";
        }

        if (process.platform === "win32") {
            return session.windowsBusyState;
        }

        return getUnixTerminalBusyState({
            shellPid: session.process.pid,
            unixPtsName: session.unixPtsName,
        });
    }

    private toTerminalSession(
        session: TerminalSessionRecord,
        busyState: TerminalBusyState,
    ): TerminalSession {
        return {
            id: session.id,
            shell: session.shell,
            cwd: session.cwd,
            currentProcess: getCurrentProcessName(session),
            isAlive: !session.exitState,
            busyState,
            sequence: session.sequence,
        };
    }

    private updateWindowsBusyState(
        session: TerminalSessionRecord,
        options?: TerminalInputOptions,
    ) {
        if (options?.source === "keyboard") {
            session.windowsBusyState = "unknown";

            if (session.windowsBusyPollTimeout) {
                clearTimeout(session.windowsBusyPollTimeout);
                session.windowsBusyPollTimeout = null;
            }

            return;
        }

        if (options?.source !== "script") {
            return;
        }

        session.windowsBusyState = "busy";
        this.scheduleWindowsBusyPoll(session.id);
    }

    private scheduleWindowsBusyPoll(id: string) {
        const session = this.terminalSessions.get(id);

        if (!session || session.exitState) {
            return;
        }

        if (session.windowsBusyPollTimeout) {
            clearTimeout(session.windowsBusyPollTimeout);
        }

        session.windowsBusyPollTimeout = setTimeout(async () => {
            const currentSession = this.terminalSessions.get(id);

            if (!currentSession || currentSession.exitState) {
                return;
            }

            const childCount = await readWindowsChildProcessCount(
                currentSession.process.pid,
            );

            if (childCount === null) {
                currentSession.windowsBusyState = "unknown";
                currentSession.windowsBusyPollTimeout = null;
                return;
            }

            if (
                childCount === 0 &&
                currentSession.windowsBusyState === "busy"
            ) {
                currentSession.windowsBusyState = "idle";
                currentSession.windowsBusyPollTimeout = null;
                return;
            }

            if (currentSession.windowsBusyState === "busy") {
                this.scheduleWindowsBusyPoll(id);
                return;
            }

            currentSession.windowsBusyPollTimeout = null;
        }, WINDOWS_POLL_INTERVAL_MS);
    }
}

function defaultShell() {
    if (process.platform === "win32") {
        return process.env.COMSPEC || DEFAULT_WINDOWS_SHELL;
    }

    return process.env.SHELL || "/bin/sh";
}

function appendHistoryChunk(history: Buffer, data: string) {
    const nextHistory = Buffer.concat([history, Buffer.from(data, "utf8")]);

    if (nextHistory.length <= MAX_HISTORY_BYTES) {
        return nextHistory;
    }

    return nextHistory.subarray(nextHistory.length - MAX_HISTORY_BYTES);
}

function readUnixPtsName(terminalProcess: pty.IPty) {
    if (process.platform === "win32") {
        return undefined;
    }

    const unixTerminal = terminalProcess as pty.IPty & {
        _pty?: string;
        ptsName?: string;
    };

    return (
        (typeof unixTerminal.ptsName === "string" && unixTerminal.ptsName) ||
        (typeof unixTerminal._pty === "string" && unixTerminal._pty) ||
        undefined
    );
}

function readWindowsChildProcessCount(
    shellPid: number,
): Promise<number | null> {
    if (process.platform !== "win32") {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        execFile(
            "powershell.exe",
            [
                "-NoProfile",
                "-Command",
                `(Get-CimInstance Win32_Process -Filter "ParentProcessId = ${shellPid}" | Measure-Object).Count`,
            ],
            (error, stdout) => {
                if (error) {
                    resolve(null);
                    return;
                }

                const childCount = Number.parseInt(stdout.trim(), 10);
                resolve(Number.isFinite(childCount) ? childCount : null);
            },
        );
    });
}

function getCurrentProcessName(session: TerminalSessionRecord) {
    return normalizeProcessName(session.process.process || session.shell);
}

function normalizeProcessName(value: string) {
    const normalizedValue = path.basename(value).trim();

    return normalizedValue || "shell";
}
