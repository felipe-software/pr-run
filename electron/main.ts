import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pty from "node-pty";

import type { TerminalCreateOptions } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

function stopBackend() {
    if (backendProcess && !backendProcess.killed) {
        backendProcess.kill();
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

    const rendererUrl = process.env.ELECTRON_RENDERER_URL;

    if (rendererUrl) {
        await mainWindow.loadURL(rendererUrl);
    } else {
        await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);

    await startBackend();

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
