import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { failure } from "@/backend/http/response";
import { logger } from "@/backend/logger";
import { registerRoutes } from "@/backend/routes";
import { ApiError } from "@/backend/types";

export function createBackendApp() {
    const app = new Elysia();

    app.use(
        cors({
            origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
            methods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
            allowedHeaders: ["content-type"],
        }),
    );

    app.onRequest(({ request }) => {
        const url = new URL(request.url);
        logger.info(
            { method: request.method, path: url.pathname },
            "backend request",
        );
    });

    app.onError(({ error, set }) => {
        if (error instanceof ApiError) {
            logger.error(
                {
                    code: error.code,
                    details: error.details,
                    metadata: error.metadata,
                },
                error.message,
            );
            set.status = error.status;
            return failure(error.message, {
                code: error.code,
                details: error.details,
                ...error.metadata,
            });
        }

        logger.error(
            { error: error instanceof Error ? error.message : String(error) },
            "unexpected backend error",
        );
        set.status = 500;
        return failure("Unexpected backend failure.", {
            code: "GIT_COMMAND_FAILED",
            details: error instanceof Error ? error.message : String(error),
        });
    });

    return registerRoutes(app);
}
