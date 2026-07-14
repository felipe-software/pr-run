import { Elysia } from "elysia";

import { terminalHandler } from "@/backend/handlers/terminal";
import { success } from "@/backend/http/response";
import { ApiError } from "@/backend/types";

const router = new Elysia();

router
    .post("/terminal/sessions", async ({ body }) => {
        const payload = body as {
            cols?: number;
            cwd?: string;
            rows?: number;
        };

        if (!payload.cwd) {
            throw new ApiError("BAD_REQUEST", "Enter a terminal cwd.", 400);
        }

        return success("Terminal session created.", [
            await terminalHandler.createSession({
                cols: Number(payload.cols ?? 80),
                cwd: payload.cwd,
                rows: Number(payload.rows ?? 24),
            }),
        ]);
    })
    .get("/terminal/sessions/:sessionId", async ({ params }) =>
        success("Terminal session loaded.", [
            await terminalHandler.getSessionSnapshot(params.sessionId),
        ]),
    )
    .get("/terminal/sessions/:sessionId/state", async ({ params }) =>
        success("Terminal session state loaded.", [
            await terminalHandler.getSessionState(params.sessionId),
        ]),
    )
    .get("/terminal/sessions/:sessionId/events", ({ params }) =>
        terminalHandler.createEventStream(params.sessionId),
    )
    .post("/terminal/sessions/:sessionId/input", ({ body, params }) => {
        const payload = body as {
            data?: string;
            options?: { source?: "keyboard" | "script" };
        };

        if (typeof payload.data !== "string") {
            throw new ApiError("BAD_REQUEST", "Enter terminal input.", 400);
        }

        terminalHandler.writeInput(
            params.sessionId,
            payload.data,
            payload.options,
        );

        return success("Terminal input written.", [{ ok: true }]);
    })
    .post("/terminal/sessions/:sessionId/resize", ({ body, params }) => {
        const payload = body as { cols?: number; rows?: number };

        terminalHandler.resizeSession(
            params.sessionId,
            Number(payload.cols ?? 80),
            Number(payload.rows ?? 24),
        );

        return success("Terminal resized.", [{ ok: true }]);
    })
    .delete("/terminal/sessions/:sessionId", ({ params }) => {
        terminalHandler.disposeSession(params.sessionId);

        return success("Terminal session disposed.", [{ ok: true }]);
    });

export default router;
