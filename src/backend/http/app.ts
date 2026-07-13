import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { isAllowedRequestOrigin } from "@/backend/http/request-origin";
import { failure } from "@/backend/http/response";
import { logger } from "@/backend/logger";
import { registerRoutes } from "@/backend/routes";
import { ApiError } from "@/backend/types";

export function createBackendApp() {
    const app = new Elysia();

    app.onRequest(({ request, set }) => {
        const url = new URL(request.url);
        logger.info(
            { method: request.method, path: url.pathname },
            "backend request",
        );

        if (isAllowedRequestOrigin(request.headers.get("origin"))) {
            return;
        }

        set.status = 403;
        return failure("Request origin is not allowed.", {
            code: "FORBIDDEN_ORIGIN",
        });
    });

    app.use(
        cors({
            allowedHeaders: true,
            methods: "*",
            origin: (request) =>
                isAllowedRequestOrigin(request.headers.get("origin")),
        }),
    );

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
