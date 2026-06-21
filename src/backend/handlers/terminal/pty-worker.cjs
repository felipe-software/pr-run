const { execFile } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const pty = require("node-pty");

const MAX_HISTORY_BYTES = 1024 * 1024;
const DEFAULT_WINDOWS_SHELL = "cmd.exe";
const WINDOWS_POLL_INTERVAL_MS = 500;

const terminalSessions = new Map();

const input = readline.createInterface({
    input: process.stdin,
    terminal: false,
});

input.on("line", (line) => {
    handleLine(line);
});

process.on("SIGTERM", () => {
    disposeAll();
    process.exit(0);
});

process.on("SIGINT", () => {
    disposeAll();
    process.exit(0);
});

async function handleLine(line) {
    const request = parseJson(line);

    if (!request) {
        return;
    }

    try {
        const data = await handleRequest(request);
        sendResponse(request.id, { ok: true, data });
    } catch (error) {
        sendResponse(request.id, {
            ok: false,
            code: error.code || "TERMINAL_SESSION_FAILED",
            details: error.details,
            message:
                error instanceof Error
                    ? error.message
                    : "Terminal request failed.",
            status: error.status || 500,
        });
    }
}

async function handleRequest(request) {
    if (request.type === "create") {
        return createSession(request.options);
    }

    if (request.type === "snapshot") {
        return getSessionSnapshot(request.sessionId);
    }

    if (request.type === "state") {
        return getSessionState(request.sessionId);
    }

    if (request.type === "input") {
        writeInput(request.sessionId, request.data, request.options);
        return { ok: true };
    }

    if (request.type === "resize") {
        resizeSession(request.sessionId, request.cols, request.rows);
        return { ok: true };
    }

    if (request.type === "dispose") {
        disposeSession(request.sessionId);
        return { ok: true };
    }

    throw createWorkerError("BAD_REQUEST", "Unknown terminal request.", 400);
}

function createSession(options) {
    const cwd = path.resolve(options.cwd);
    const stat = fs.statSync(cwd);

    if (!stat.isDirectory()) {
        throw createWorkerError(
            "BAD_REQUEST",
            "Terminal cwd must be a directory.",
            400,
        );
    }

    const shellPath = defaultShell();
    const env = Object.fromEntries(
        Object.entries(process.env).filter(
            (entry) => typeof entry[1] === "string",
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
    const session = {
        id,
        process: terminalProcess,
        shell: shellPath,
        cwd,
        history: Buffer.alloc(0),
        sequence: 0,
        unixPtsName: readUnixPtsName(terminalProcess),
        windowsBusyPollTimeout: null,
        windowsBusyState: "idle",
    };

    terminalProcess.onData((data) => {
        handleProcessData(session.id, data);
    });
    terminalProcess.onExit(({ exitCode, signal }) => {
        handleProcessExit(session.id, { exitCode, signal });
    });

    terminalSessions.set(id, session);

    return toTerminalSession(session, "idle");
}

async function getSessionSnapshot(id) {
    const session = getSessionOrThrow(id);
    const busyState = await getBusyState(session);

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

async function getSessionState(id) {
    const session = getSessionOrThrow(id);
    const busyState = await getBusyState(session);

    return {
        id: session.id,
        currentProcess: getCurrentProcessName(session),
        isAlive: !session.exitState,
        busyState,
        sequence: session.sequence,
    };
}

function writeInput(id, data, options) {
    const session = getSessionOrThrow(id);

    if (session.exitState) {
        throw createWorkerError(
            "BAD_REQUEST",
            "Terminal session has already exited.",
            400,
        );
    }

    if (process.platform === "win32") {
        updateWindowsBusyState(session, options);
    }

    session.process.write(data);
}

function resizeSession(id, cols, rows) {
    const session = getSessionOrThrow(id);
    session.process.resize(Math.max(2, cols), Math.max(2, rows));
}

function disposeSession(id) {
    getSessionOrThrow(id);
    closeTerminalSession(id);
}

function disposeAll() {
    for (const id of terminalSessions.keys()) {
        closeTerminalSession(id);
    }
}

function getSessionOrThrow(id) {
    const session = terminalSessions.get(id);

    if (!session) {
        throw createWorkerError(
            "NOT_FOUND",
            "Terminal session was not found.",
            404,
        );
    }

    return session;
}

function closeTerminalSession(id) {
    const session = terminalSessions.get(id);

    if (!session) {
        return;
    }

    terminalSessions.delete(id);

    if (session.windowsBusyPollTimeout) {
        clearTimeout(session.windowsBusyPollTimeout);
        session.windowsBusyPollTimeout = null;
    }

    session.process.kill();
}

function handleProcessData(id, data) {
    const session = terminalSessions.get(id);

    if (!session) {
        return;
    }

    session.history = appendHistoryChunk(session.history, data);
    session.sequence += 1;
    sendEvent({
        id: session.id,
        data,
        currentProcess: getCurrentProcessName(session),
        sequence: session.sequence,
        type: "data",
    });
}

function handleProcessExit(id, exitState) {
    const session = terminalSessions.get(id);

    if (!session) {
        return;
    }

    if (session.windowsBusyPollTimeout) {
        clearTimeout(session.windowsBusyPollTimeout);
        session.windowsBusyPollTimeout = null;
    }

    session.exitState = exitState;
    session.sequence += 1;
    sendEvent({
        id: session.id,
        exitCode: exitState.exitCode,
        signal: exitState.signal,
        currentProcess: getCurrentProcessName(session),
        sequence: session.sequence,
        type: "exit",
    });
}

async function getBusyState(session) {
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

function toTerminalSession(session, busyState) {
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

function updateWindowsBusyState(session, options) {
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
    scheduleWindowsBusyPoll(session.id);
}

function scheduleWindowsBusyPoll(id) {
    const session = terminalSessions.get(id);

    if (!session || session.exitState) {
        return;
    }

    if (session.windowsBusyPollTimeout) {
        clearTimeout(session.windowsBusyPollTimeout);
    }

    session.windowsBusyPollTimeout = setTimeout(async () => {
        const currentSession = terminalSessions.get(id);

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

        if (childCount === 0 && currentSession.windowsBusyState === "busy") {
            currentSession.windowsBusyState = "idle";
            currentSession.windowsBusyPollTimeout = null;
            return;
        }

        if (currentSession.windowsBusyState === "busy") {
            scheduleWindowsBusyPoll(id);
            return;
        }

        currentSession.windowsBusyPollTimeout = null;
    }, WINDOWS_POLL_INTERVAL_MS);
}

function defaultShell() {
    if (process.platform === "win32") {
        return process.env.COMSPEC || DEFAULT_WINDOWS_SHELL;
    }

    return process.env.SHELL || "/bin/sh";
}

function appendHistoryChunk(history, data) {
    const nextHistory = Buffer.concat([history, Buffer.from(data, "utf8")]);

    if (nextHistory.length <= MAX_HISTORY_BYTES) {
        return nextHistory;
    }

    return nextHistory.subarray(nextHistory.length - MAX_HISTORY_BYTES);
}

function readUnixPtsName(terminalProcess) {
    if (process.platform === "win32") {
        return undefined;
    }

    return (
        (typeof terminalProcess.ptsName === "string" &&
            terminalProcess.ptsName) ||
        (typeof terminalProcess._pty === "string" && terminalProcess._pty) ||
        undefined
    );
}

function readWindowsChildProcessCount(shellPid) {
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

function getUnixTerminalBusyState(params) {
    if (!params.unixPtsName) {
        return "busy";
    }

    const terminalName = params.unixPtsName.replace(/^\/dev\//, "");

    return new Promise((resolve) => {
        execFile(
            "ps",
            ["-o", "pid=,pgid=,tpgid=,stat=,comm=", "-t", terminalName],
            (error, stdout) => {
                if (error) {
                    resolve("busy");
                    return;
                }

                const rows = parseTerminalProcessRows(stdout);

                if (!rows) {
                    resolve("busy");
                    return;
                }

                resolve(
                    classifyUnixTerminalBusyState({
                        rows,
                        shellPid: params.shellPid,
                    }),
                );
            },
        );
    });
}

function parseTerminalProcessRows(output) {
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
            };
        });

    if (!rows.length || rows.some((row) => row === null)) {
        return null;
    }

    return rows;
}

function classifyUnixTerminalBusyState(params) {
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

function getCurrentProcessName(session) {
    return normalizeProcessName(session.process.process || session.shell);
}

function normalizeProcessName(value) {
    const normalizedValue = path.basename(value).trim();

    return normalizedValue || "shell";
}

function sendResponse(id, response) {
    sendMessage({
        id,
        type: "response",
        ...response,
    });
}

function sendEvent(event) {
    sendMessage({
        event,
        type: "event",
    });
}

function sendMessage(message) {
    process.stdout.write(`${JSON.stringify(message)}\n`);
}

function parseJson(value) {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function createWorkerError(code, message, status, details) {
    const error = new Error(message);
    error.code = code;
    error.details = details;
    error.status = status;
    return error;
}
