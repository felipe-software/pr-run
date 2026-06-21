import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tryPromise } from "@/backend/handlers/error";
import { terminalHandler } from "@/backend/handlers/terminal";
import { createBackendApp } from "@/backend/http/app";

type CliOptions = {
    backendPort: number;
    host: string;
    open: boolean;
    uiPort: number;
};

type PackageJson = {
    version?: string;
};

type ParseArgsResult =
    | { message: string; type: "error" }
    | { message: string; type: "exit" }
    | { options: CliOptions; type: "run" };

const DEFAULT_BACKEND_PORT = 33134;
const DEFAULT_UI_PORT = 33133;
const DEFAULT_HOST = "127.0.0.1";
const cliDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(cliDirectory, "../..");
const distDirectory = path.join(packageRoot, "dist");

const CONTENT_TYPES: Record<string, string> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".webp": "image/webp",
};

async function main() {
    const parsedArgs = parseArgs(process.argv.slice(2));

    if (parsedArgs.type === "exit") {
        process.stdout.write(`${parsedArgs.message}\n`);
        return;
    }

    if (parsedArgs.type === "error") {
        process.stderr.write(`${parsedArgs.message}\n`);
        process.exit(1);
    }

    await ensureUserDataDirectory();

    const backendPort = await resolveAvailablePort(
        parsedArgs.options.backendPort,
        parsedArgs.options.host,
    );
    const backendApp = createBackendApp().listen({
        hostname: parsedArgs.options.host,
        port: backendPort,
    });
    const resolvedBackendPort = backendApp.server?.port ?? backendPort;
    const backendUrl = `http://${parsedArgs.options.host}:${resolvedBackendPort}`;

    const uiPort = await resolveAvailablePort(
        parsedArgs.options.uiPort,
        parsedArgs.options.host,
    );
    const uiServer = Bun.serve({
        fetch: serveStaticAsset,
        hostname: parsedArgs.options.host,
        port: uiPort,
    });
    const uiUrl = `http://${parsedArgs.options.host}:${uiServer.port}/?api=${encodeURIComponent(backendUrl)}`;

    let isShuttingDown = false;
    const shutdown = async (exitCode: number) => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        terminalHandler.disposeAll();
        await tryPromise(
            Promise.resolve().then(() => backendApp.server?.stop(true)),
        );
        uiServer.stop(true);
        process.exit(exitCode);
    };

    process.once("SIGINT", () => {
        shutdown(0);
    });
    process.once("SIGTERM", () => {
        shutdown(0);
    });

    process.stdout.write(`pr-run backend: ${backendUrl}\n`);
    process.stdout.write(`pr-run browser: ${uiUrl}\n`);

    if (parsedArgs.options.open) {
        const [openError] = await tryPromise(openBrowser(uiUrl));

        if (openError) {
            process.stderr.write(
                `Could not open the browser automatically. Open this URL manually:\n${uiUrl}\n`,
            );
        }
    }

    await new Promise(() => undefined);
}

function parseArgs(args: string[]): ParseArgsResult {
    const options: CliOptions = {
        backendPort: DEFAULT_BACKEND_PORT,
        host: DEFAULT_HOST,
        open: true,
        uiPort: DEFAULT_UI_PORT,
    };

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];

        switch (arg) {
            case "--backend-port":
                index += 1;
                options.backendPort = parsePort(args[index], "--backend-port");
                break;
            case "--help":
            case "-h":
                return { message: helpText(), type: "exit" };
            case "--host":
                index += 1;
                options.host = parseValue(args[index], "--host");
                break;
            case "--no-open":
                options.open = false;
                break;
            case "--ui-port":
                index += 1;
                options.uiPort = parsePort(args[index], "--ui-port");
                break;
            case "--version":
            case "-v":
                return { message: packageVersion(), type: "exit" };
            default:
                return {
                    message: `Unknown option: ${arg}\n\n${helpText()}`,
                    type: "error",
                };
        }
    }

    return { options, type: "run" };
}

function parseValue(value: string | undefined, optionName: string) {
    if (!value?.trim()) {
        throw new Error(`Missing value for ${optionName}.`);
    }

    return value;
}

function parsePort(value: string | undefined, optionName: string) {
    const rawValue = parseValue(value, optionName);
    const port = Number(rawValue);

    if (!Number.isInteger(port) || port < 0 || port > 65535) {
        throw new Error(`${optionName} must be a port between 0 and 65535.`);
    }

    return port;
}

function helpText() {
    return `Usage: pr-run [options]

Options:
  --backend-port <port>  Backend port. Defaults to ${DEFAULT_BACKEND_PORT}.
  --host <host>          Hostname. Defaults to ${DEFAULT_HOST}.
  --no-open              Print the browser URL without opening it.
  --ui-port <port>       Browser UI port. Defaults to ${DEFAULT_UI_PORT}.
  -h, --help             Show this help.
  -v, --version          Show the installed version.`;
}

function packageVersion() {
    const packageJson = JSON.parse(
        readFileSync(path.join(packageRoot, "package.json"), "utf8"),
    ) as PackageJson;

    return packageJson.version ?? "0.0.0";
}

async function ensureUserDataDirectory() {
    if (process.env.PR_RUN_USER_DATA_DIR) {
        return;
    }

    const userDataDirectory = defaultUserDataDirectory();
    await mkdir(userDataDirectory, { recursive: true });
    process.env.PR_RUN_USER_DATA_DIR = userDataDirectory;
}

function defaultUserDataDirectory() {
    if (process.platform === "darwin") {
        return path.join(os.homedir(), "Library/Application Support/pr-run");
    }

    if (process.platform === "win32") {
        return path.join(
            process.env.APPDATA ?? path.join(os.homedir(), "AppData/Roaming"),
            "pr-run",
        );
    }

    return path.join(
        process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"),
        "pr-run",
    );
}

async function resolveAvailablePort(preferredPort: number, host: string) {
    if (preferredPort === 0 || (await isPortAvailable(preferredPort, host))) {
        return preferredPort;
    }

    return 0;
}

function isPortAvailable(port: number, host: string) {
    return new Promise<boolean>((resolve) => {
        const server = net.createServer();

        server.once("error", () => {
            resolve(false);
        });

        server.listen(port, host, () => {
            server.close(() => {
                resolve(true);
            });
        });
    });
}

async function serveStaticAsset(request: Request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed.", { status: 405 });
    }

    const url = new URL(request.url);
    const requestedPath = decodeURIComponent(url.pathname);
    const relativePath =
        requestedPath === "/"
            ? "index.html"
            : requestedPath.replace(/^\/+/, "");
    const assetPath = path.join(distDirectory, relativePath);

    if (!isInsideDirectory(distDirectory, assetPath)) {
        return new Response("Not found.", { status: 404 });
    }

    const assetResponse = await fileResponse(assetPath);

    if (assetResponse) {
        return assetResponse;
    }

    return (
        (await fileResponse(path.join(distDirectory, "index.html"))) ??
        new Response(
            "PR Run has not been built yet. Run `bun run build:npm`.",
            {
                status: 500,
            },
        )
    );
}

function isInsideDirectory(directory: string, candidate: string) {
    const relative = path.relative(directory, candidate);
    return (
        Boolean(relative) &&
        !relative.startsWith("..") &&
        !path.isAbsolute(relative)
    );
}

async function fileResponse(filePath: string) {
    const file = Bun.file(filePath);

    if (!(await file.exists())) {
        return null;
    }

    return new Response(file, {
        headers: {
            "content-type":
                CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
                "application/octet-stream",
        },
    });
}

async function openBrowser(url: string) {
    const command =
        process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "cmd"
              : "xdg-open";
    const args =
        process.platform === "win32" ? ["/c", "start", "", url] : [url];

    await new Promise<void>((resolve, reject) => {
        const childProcess = spawn(command, args, {
            detached: true,
            stdio: "ignore",
        });

        childProcess.once("error", reject);
        childProcess.once("spawn", () => {
            childProcess.unref();
            resolve();
        });
    });
}

const [mainError] = await tryPromise(main());

if (mainError) {
    process.stderr.write(`${mainError.message}\n`);
    process.exit(1);
}
