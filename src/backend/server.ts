import net from "node:net";

import { createBackendApp } from "@/backend/http/app";
import { terminalHandler } from "@/backend/handlers/terminal";
import { logger } from "@/backend/logger";

const DEFAULT_BACKEND_PORT = 33134;
const host = "127.0.0.1";
const port = await resolveBackendPort();

const app = createBackendApp();
const server = app.listen({
    hostname: host,
    port,
});

logger.info({ url: `http://${host}:${server.server?.port}` }, "backend ready");

async function resolveBackendPort() {
    const configuredPort = Number(
        process.env.PR_RUN_BACKEND_PORT ?? DEFAULT_BACKEND_PORT,
    );

    if (!Number.isFinite(configuredPort) || configuredPort < 0) {
        return DEFAULT_BACKEND_PORT;
    }

    if (configuredPort === 0) {
        return 0;
    }

    const isAvailable = await isPortAvailable(configuredPort);

    if (isAvailable) {
        return configuredPort;
    }

    logger.warn(
        { port: configuredPort },
        "backend port unavailable, falling back to a dynamic port",
    );

    return 0;
}

function isPortAvailable(portToCheck: number) {
    return new Promise<boolean>((resolve) => {
        const probe = net.createServer();

        probe.once("error", () => {
            resolve(false);
        });

        probe.listen(portToCheck, host, () => {
            probe.close(() => {
                resolve(true);
            });
        });
    });
}

function disposeBackendResources() {
    terminalHandler.disposeAll();
}

process.once("SIGINT", () => {
    disposeBackendResources();
    process.exit(0);
});

process.once("SIGTERM", () => {
    disposeBackendResources();
    process.exit(0);
});
