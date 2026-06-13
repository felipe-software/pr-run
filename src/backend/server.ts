import { createBackendApp } from "@/backend/http/app";
import { logger } from "@/backend/logger";

const port = Number(process.env.PR_RUN_BACKEND_PORT ?? 0);
const host = "127.0.0.1";

const app = createBackendApp();
const server = app.listen({
    hostname: host,
    port,
});

logger.info({ url: `http://${host}:${server.server?.port}` }, "backend ready");
