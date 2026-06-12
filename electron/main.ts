import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import * as pty from "node-pty";

import type { TerminalCreateOptions } from "./types.js";

const projectRoot = path.join(__dirname, "..");

let backendProcess: ChildProcessWithoutNullStreams | null = null;
let backendUrl: string | null = null;
const terminalSessions = new Map<
    string,
    {
        process: pty.IPty;
        webContentsId: number;
    }
>();

function defaultShell() {
    if (process.platform === "win32") {
        return process.env.COMSPEC || "cmd.exe";
    }

    return process.env.SHELL || "/bin/sh";
}

function createTerminalSession(
    webContentsId: number,
    options: TerminalCreateOptions,
) {
    const cwd = path.resolve(options.cwd);
    const stat = fs.statSync(cwd);

    if (!stat.isDirectory()) {
        throw new Error("Terminal cwd must be a directory.");
    }

    const shellPath = defaultShell();
    const env = Object.fromEntries(
        Object.entries(process.env).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
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

    terminalSessions.set(id, {
        process: terminalProcess,
        webContentsId,
    });

    return {
        id,
        shell: shellPath,
        cwd,
        process: terminalProcess,
    };
}

function closeTerminalSession(id: string) {
    const session = terminalSessions.get(id);

    if (!session) {
        return;
    }

    terminalSessions.delete(id);
    session.process.kill();
}

function closeWebContentsTerminals(webContentsId: number) {
    for (const [id, session] of terminalSessions) {
        if (session.webContentsId === webContentsId) {
            closeTerminalSession(id);
        }
    }
}

function getAvailablePort() {
    return new Promise<number>((resolve, reject) => {
        const server = net.createServer();

        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            server.close(() => {
                if (address && typeof address === "object") {
                    resolve(address.port);
                } else {
                    reject(new Error("Unable to allocate a local port"));
                }
            });
        });
    });
}

async function waitForBackend(url: string) {
    const deadline = Date.now() + 10_000;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${url}/health`);

            if (response.ok) {
                return;
            }
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 120));
        }
    }

    throw new Error("Bun backend did not respond to the healthcheck.");
}

async function startBackend() {
    const port = await getAvailablePort();
    const url = `http://127.0.0.1:${port}`;

    backendProcess = spawn("bun", ["src/backend/server.ts"], {
        cwd: projectRoot,
        env: {
            ...process.env,
            PR_RUN_BACKEND_PORT: String(port),
            PR_RUN_USER_DATA_DIR: app.getPath("userData"),
        },
    });

    backendProcess.stdout.on("data", (chunk) => {
        process.stdout.write(`[pr-run-backend] ${chunk}`);
    });

    backendProcess.stderr.on("data", (chunk) => {
        process.stderr.write(`[pr-run-backend] ${chunk}`);
    });

    backendProcess.once("exit", (code, signal) => {
        if (backendProcess) {
            process.stderr.write(
                `[pr-run-backend] exited code=${code ?? "null"} signal=${signal ?? "null"}\n`,
            );
        }

        backendProcess = null;
    });

    await waitForBackend(url);
    backendUrl = url;
}

function resolveExternalBackendUrl() {
    const configuredUrl = process.env.ELECTRON_BACKEND_URL;

    if (!configuredUrl) {
        return null;
    }

    return configuredUrl.replace(/\/$/, "");
}

function shouldSkipBackendHealthcheck() {
    return process.env.ELECTRON_SKIP_BACKEND_HEALTHCHECK === "1";
}

function isDevRendererMode() {
    return Boolean(process.env.ELECTRON_RENDERER_URL);
}

function stopBackend() {
    if (backendProcess && !backendProcess.killed) {
        backendProcess.kill();
    }
}

function renderLoadingPage(mainWindow: BrowserWindow, rendererUrl: string) {
    const html = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PR Run</title>
        <style>
            :root {
                color-scheme: light;
                font-family: sans-serif;
            }

            body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                background: #f5f5f4;
                color: #1c1917;
            }

            main {
                max-width: 32rem;
                padding: 2rem;
                text-align: center;
            }

            h1 {
                margin: 0 0 0.75rem;
                font-size: 1.5rem;
            }

            p {
                margin: 0;
                line-height: 1.5;
                color: #57534e;
            }

            code {
                font-family: monospace;
                background: #e7e5e4;
                padding: 0.15rem 0.35rem;
                border-radius: 0.35rem;
            }
        </style>
    </head>
    <body>
        <main>
            <h1>Waiting for Vite dev server</h1>
            <p>Electron will reconnect automatically when <code>${rendererUrl}</code> becomes available.</p>
        </main>
    </body>
</html>`;

    void mainWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    );
}

function scheduleRendererReload(
    mainWindow: BrowserWindow,
    rendererUrl: string,
) {
    if (mainWindow.isDestroyed()) {
        return;
    }

    setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
            void loadRenderer(mainWindow, rendererUrl);
        }
    }, 700);
}

async function loadRenderer(mainWindow: BrowserWindow, rendererUrl: string) {
    try {
        await mainWindow.loadURL(rendererUrl);
    } catch {
        renderLoadingPage(mainWindow, rendererUrl);
        scheduleRendererReload(mainWindow, rendererUrl);
    }
}

async function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1180,
        height: 780,
        minWidth: 920,
        minHeight: 620,
        title: "PR Run",
        autoHideMenuBar: true,
        backgroundColor: "#ffffff",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        void shell.openExternal(url);
        return { action: "deny" };
    });

    mainWindow.webContents.on(
        "console-message",
        (_event, level, message, line, sourceId) => {
            const source = sourceId || "renderer";
            process.stdout.write(
                `[pr-run-renderer:${level}] ${source}:${line} ${message}\n`,
            );
        },
    );

    mainWindow.webContents.on("render-process-gone", (_event, details) => {
        process.stderr.write(
            `[pr-run-renderer] process gone: ${details.reason}\n`,
        );
    });

    if (isDevRendererMode()) {
        mainWindow.webContents.openDevTools({ mode: "detach" });
    }

    const rendererUrl = process.env.ELECTRON_RENDERER_URL;

    if (rendererUrl) {
        if (isDevRendererMode()) {
            renderLoadingPage(mainWindow, rendererUrl);
            void loadRenderer(mainWindow, rendererUrl);
        } else {
            await mainWindow.loadURL(rendererUrl);
        }
    } else {
        await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

app.whenReady()
    .then(async () => {
        Menu.setApplicationMenu(null);

        const externalBackendUrl = resolveExternalBackendUrl();

        if (externalBackendUrl) {
            backendUrl = externalBackendUrl;

            if (!shouldSkipBackendHealthcheck()) {
                await waitForBackend(backendUrl);
            }
        } else {
            await startBackend();
        }

        ipcMain.handle("backend:getUrl", () => {
            if (!backendUrl) {
                throw new Error("Backend is not ready yet.");
            }

            return backendUrl;
        });

        ipcMain.handle(
            "terminal:create",
            (event, options: TerminalCreateOptions) => {
                const session = createTerminalSession(event.sender.id, options);

                session.process.onData((data) => {
                    if (!event.sender.isDestroyed()) {
                        event.sender.send("terminal:data", {
                            id: session.id,
                            data,
                        });
                    }
                });

                session.process.onExit(({ exitCode, signal }) => {
                    terminalSessions.delete(session.id);

                    if (!event.sender.isDestroyed()) {
                        event.sender.send("terminal:exit", {
                            id: session.id,
                            exitCode,
                            signal,
                        });
                    }
                });

                event.sender.once("destroyed", () => {
                    closeWebContentsTerminals(event.sender.id);
                });

                return {
                    id: session.id,
                    shell: session.shell,
                    cwd: session.cwd,
                };
            },
        );

        ipcMain.handle("terminal:input", (_event, id: string, data: string) => {
            terminalSessions.get(id)?.process.write(data);
        });

        ipcMain.handle(
            "terminal:resize",
            (_event, id: string, cols: number, rows: number) => {
                terminalSessions
                    .get(id)
                    ?.process.resize(Math.max(2, cols), Math.max(2, rows));
            },
        );

        ipcMain.handle("terminal:dispose", (_event, id: string) => {
            closeTerminalSession(id);
        });

        await createWindow();

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                void createWindow();
            }
        });
    })
    .catch((error: unknown) => {
        const message =
            error instanceof Error
                ? (error.stack ?? error.message)
                : String(error);
        process.stderr.write(`[pr-run-electron] failed to start: ${message}\n`);
        app.quit();
    });

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("before-quit", () => {
    for (const id of terminalSessions.keys()) {
        closeTerminalSession(id);
    }

    stopBackend();
});
