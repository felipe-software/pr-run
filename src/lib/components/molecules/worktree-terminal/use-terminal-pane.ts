import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";

import { tryPromise } from "@/lib/error";
import type {
    TerminalDataEvent,
    TerminalExitEvent,
    TerminalSessionSnapshot,
} from "@/types/pr-run";

type TerminalPaneEvent =
    | ({ type: "data" } & TerminalDataEvent)
    | ({ type: "exit" } & TerminalExitEvent);

type UseTerminalPaneParams = {
    onExit: () => void;
    onManualInput: () => void;
    onSnapshot: (snapshot: TerminalSessionSnapshot) => void;
    onUpdate: (
        snapshot: Pick<
            TerminalSessionSnapshot,
            "busyState" | "currentProcess" | "id" | "isAlive"
        >,
    ) => void;
    sessionId: string;
};

export function useTerminalPane({
    onExit,
    onManualInput,
    onSnapshot,
    onUpdate,
    sessionId,
}: UseTerminalPaneParams) {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mount = mountRef.current;

        if (!mount) {
            return;
        }

        const lifecycle = { disposed: false, hydrated: false };
        const pendingEvents: TerminalPaneEvent[] = [];
        let lastSequence = 0;
        const fitAddon = new FitAddon();
        const terminal = new Terminal({
            cursorBlink: true,
            convertEol: true,
            fontFamily:
                '"IBM Plex Mono", "Azeret Mono", "SFMono-Regular", Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.25,
            scrollback: 8_000,
            theme: {
                background: "#0f0f0f",
                foreground: "#f5f1e8",
                cursor: "#f5f1e8",
                selectionBackground: "#f5f1e833",
                black: "#111111",
                red: "#ff8f8f",
                green: "#42d66e",
                yellow: "#f0c674",
                blue: "#8ab4f8",
                magenta: "#c792ea",
                cyan: "#89ddff",
                white: "#f5f1e8",
                brightBlack: "#6e675d",
                brightRed: "#ffb4b4",
                brightGreen: "#8de99f",
                brightYellow: "#ffe08a",
                brightBlue: "#a8c7fa",
                brightMagenta: "#d7aefb",
                brightCyan: "#b3ecff",
                brightWhite: "#ffffff",
            },
        });

        terminal.loadAddon(fitAddon);
        terminal.open(mount);
        void fitTerminal(fitAddon);
        terminal.focus();

        const dataDisposable = terminal.onData((data) => {
            onManualInput();
            void window.prRun.writeTerminalInput(sessionId, data, {
                source: "keyboard",
            });
        });
        const unsubscribeData = window.prRun.onTerminalData((event) => {
            if (event.id !== sessionId) {
                return;
            }

            handleTerminalEvent(
                terminal,
                lifecycle,
                pendingEvents,
                { ...event, type: "data" },
                onUpdate,
                () => undefined,
                () => lastSequence,
                (sequence) => {
                    lastSequence = sequence;
                },
            );
        });
        const unsubscribeExit = window.prRun.onTerminalExit((event) => {
            if (event.id !== sessionId) {
                return;
            }

            handleTerminalEvent(
                terminal,
                lifecycle,
                pendingEvents,
                { ...event, type: "exit" },
                onUpdate,
                onExit,
                () => lastSequence,
                (sequence) => {
                    lastSequence = sequence;
                },
            );
        });
        const resizeObserver = new ResizeObserver(() => {
            void fitTerminal(fitAddon).then(() => {
                if (!lifecycle.disposed) {
                    void window.prRun.resizeTerminal(
                        sessionId,
                        terminal.cols,
                        terminal.rows,
                    );
                }
            });
        });

        resizeObserver.observe(mount);

        void hydrateTerminal({
            lifecycle,
            onSnapshot,
            onUpdate,
            pendingEvents,
            sessionId,
            setLastSequence: (sequence) => {
                lastSequence = sequence;
            },
            terminal,
        });

        return () => {
            lifecycle.disposed = true;
            resizeObserver.disconnect();
            unsubscribeData();
            unsubscribeExit();
            dataDisposable.dispose();
            terminal.dispose();
        };
    }, [onExit, onManualInput, onSnapshot, onUpdate, sessionId]);

    return { mountRef };
}

async function hydrateTerminal({
    lifecycle,
    onSnapshot,
    onUpdate,
    pendingEvents,
    sessionId,
    setLastSequence,
    terminal,
}: {
    lifecycle: { disposed: boolean; hydrated: boolean };
    onSnapshot: (snapshot: TerminalSessionSnapshot) => void;
    onUpdate: (
        snapshot: Pick<
            TerminalSessionSnapshot,
            "busyState" | "currentProcess" | "id" | "isAlive"
        >,
    ) => void;
    pendingEvents: TerminalPaneEvent[];
    sessionId: string;
    setLastSequence: (sequence: number) => void;
    terminal: Terminal;
}) {
    const [error, snapshot] = await tryPromise(
        window.prRun.getTerminalSessionSnapshot(sessionId),
    );

    if (lifecycle.disposed) {
        return;
    }

    if (error) {
        terminal.writeln(
            error instanceof Error
                ? error.message
                : "Failed to hydrate terminal session.",
        );
        return;
    }

    terminal.write(`[${snapshot.shell}] ${snapshot.cwd}\r\n`);

    if (snapshot.history) {
        terminal.write(snapshot.history);
    }

    if (!snapshot.isAlive && snapshot.exitCode !== undefined) {
        writeExitMessage(terminal, snapshot.exitCode, snapshot.signal);
    }

    onSnapshot(snapshot);
    onUpdate(snapshot);
    setLastSequence(snapshot.sequence);
    lifecycle.hydrated = true;

    for (const event of pendingEvents.sort(
        (left, right) => left.sequence - right.sequence,
    )) {
        if (event.sequence <= snapshot.sequence) {
            continue;
        }

        applyTerminalEvent(terminal, event);
        onUpdate(eventToSessionUpdate(event));
        setLastSequence(event.sequence);
    }
}

function handleTerminalEvent(
    terminal: Terminal,
    lifecycle: { hydrated: boolean },
    pendingEvents: TerminalPaneEvent[],
    event: TerminalPaneEvent,
    onUpdate: (
        snapshot: Pick<
            TerminalSessionSnapshot,
            "busyState" | "currentProcess" | "id" | "isAlive"
        >,
    ) => void,
    onExit: () => void,
    getLastSequence: () => number,
    setLastSequence: (sequence: number) => void,
) {
    if (!lifecycle.hydrated) {
        pendingEvents.push(event);
        return;
    }

    if (event.sequence <= getLastSequence()) {
        return;
    }

    applyTerminalEvent(terminal, event, onExit);
    onUpdate(eventToSessionUpdate(event));
    setLastSequence(event.sequence);
}

function applyTerminalEvent(
    terminal: Terminal,
    event: TerminalPaneEvent,
    onExit?: () => void,
) {
    if (event.type === "data") {
        terminal.write(event.data);
        return;
    }

    writeExitMessage(terminal, event.exitCode, event.signal);
    onExit?.();
}

function writeExitMessage(
    terminal: Terminal,
    exitCode: number,
    signal?: number,
) {
    terminal.writeln("");
    terminal.writeln(
        `[process exited with code ${exitCode}${signal ? `, signal ${signal}` : ""}]`,
    );
}

function eventToSessionUpdate(event: TerminalPaneEvent) {
    return {
        id: event.id,
        currentProcess: event.currentProcess,
        isAlive: event.type === "data",
        busyState: "unknown" as const,
    };
}

async function fitTerminal(fitAddon: FitAddon) {
    await tryPromise(Promise.resolve().then(() => fitAddon.fit()));
}
