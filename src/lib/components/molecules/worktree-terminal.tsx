import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";

import { tryPromise } from "@/lib/error";

type WorktreeTerminalProps = {
    worktreePath: string;
};

export function WorktreeTerminal({ worktreePath }: WorktreeTerminalProps) {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mount = mountRef.current;

        if (!mount) {
            return;
        }

        const lifecycle = { disposed: false };
        let sessionId: string | undefined;
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
        fitTerminal(fitAddon);
        terminal.focus();

        const dataDisposable = terminal.onData((data) => {
            if (!sessionId) {
                return;
            }

            void window.prRun.writeTerminalInput(sessionId, data);
        });
        const unsubscribeData = window.prRun.onTerminalData((event) => {
            if (event.id === sessionId) {
                terminal.write(event.data);
            }
        });
        const unsubscribeExit = window.prRun.onTerminalExit((event) => {
            if (event.id !== sessionId) {
                return;
            }

            terminal.writeln("");
            terminal.writeln(
                `[process exited with code ${event.exitCode}${event.signal ? `, signal ${event.signal}` : ""}]`,
            );
        });
        const resizeObserver = new ResizeObserver(() => {
            if (!sessionId) {
                fitTerminal(fitAddon);
                return;
            }

            fitTerminal(fitAddon);
            void window.prRun.resizeTerminal(
                sessionId,
                terminal.cols,
                terminal.rows,
            );
        });

        resizeObserver.observe(mount);

        void startTerminalSession({
            lifecycle,
            fitAddon,
            terminal,
            worktreePath,
        }).then((id) => {
            sessionId = id;
        });

        return () => {
            lifecycle.disposed = true;
            resizeObserver.disconnect();
            unsubscribeData();
            unsubscribeExit();
            dataDisposable.dispose();
            terminal.dispose();

            if (sessionId) {
                void window.prRun.disposeTerminalSession(sessionId);
            }
        };
    }, [worktreePath]);

    return <div className="worktree-terminal-viewport" ref={mountRef} />;
}

async function startTerminalSession({
    lifecycle,
    fitAddon,
    terminal,
    worktreePath,
}: {
    lifecycle: { disposed: boolean };
    fitAddon: FitAddon;
    terminal: Terminal;
    worktreePath: string;
}) {
    const [error, session] = await tryPromise(
        window.prRun.createTerminalSession({
            cwd: worktreePath,
            cols: terminal.cols,
            rows: terminal.rows,
        }),
    );

    if (error) {
        terminal.writeln(
            error instanceof Error
                ? error.message
                : "Failed to start terminal session.",
        );
        return undefined;
    }

    if (lifecycle.disposed) {
        void window.prRun.disposeTerminalSession(session.id);
        return undefined;
    }

    fitTerminal(fitAddon);
    terminal.writeln(`[${session.shell}] ${session.cwd}`);
    return session.id;
}

async function fitTerminal(fitAddon: FitAddon) {
    await tryPromise(Promise.resolve().then(() => fitAddon.fit()));
}
