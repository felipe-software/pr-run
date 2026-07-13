import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Stream from "effect/Stream";

import type {
    TerminalCreateOptions,
    TerminalInputOptions,
    TerminalSession,
    TerminalSessionSnapshot,
} from "@/types/pr-run";
import { clientRuntime, requestOne, toApiUrl } from "./transport";

export const terminalApi = {
    createTerminalSession(options: TerminalCreateOptions) {
        return requestOne<TerminalSession>("/terminal/sessions", {
            json: options,
            method: "POST",
        });
    },
    disposeTerminalSession(sessionId: string) {
        return requestOne<{ ok: true }>(sessionPath(sessionId), {
            method: "DELETE",
        });
    },
    getTerminalSessionSnapshot(sessionId: string) {
        return requestOne<TerminalSessionSnapshot>(sessionPath(sessionId));
    },
    getTerminalSessionState(sessionId: string) {
        return requestOne<
            Pick<
                TerminalSessionSnapshot,
                "busyState" | "currentProcess" | "id" | "isAlive" | "sequence"
            >
        >(sessionPath(sessionId, "/state"));
    },
    resizeTerminal(sessionId: string, cols: number, rows: number) {
        return requestOne<{ ok: true }>(sessionPath(sessionId, "/resize"), {
            json: { cols, rows },
            method: "POST",
        });
    },
    subscribeTerminalEvents(
        sessionId: string,
        onMessage: (message: string) => void,
        onError: (error: unknown) => void,
    ) {
        const fiber = clientRuntime.runFork(
            Stream.runForEach(terminalEventStream(sessionId), (message) =>
                Effect.sync(() => onMessage(message)),
            ).pipe(
                Effect.catchAll((error) => Effect.sync(() => onError(error))),
            ),
        );

        return () => {
            clientRuntime.runFork(Fiber.interrupt(fiber));
        };
    },
    writeTerminalInput(
        sessionId: string,
        data: string,
        options?: TerminalInputOptions,
    ) {
        return requestOne<{ ok: true }>(sessionPath(sessionId, "/input"), {
            json: { data, options },
            method: "POST",
        });
    },
};

function terminalEventStream(sessionId: string) {
    return Stream.asyncPush<string, unknown>((emit) =>
        Effect.acquireRelease(
            Effect.tryPromise({
                catch: (error) => error,
                try: async () =>
                    new EventSource(
                        await toApiUrl(sessionPath(sessionId, "/events")),
                    ),
            }).pipe(
                Effect.tap((eventSource) =>
                    Effect.sync(() => {
                        eventSource.onmessage = (message) => {
                            emit.single(message.data);
                        };
                    }),
                ),
                Effect.withSpan("PrRunTerminal.openEventStream"),
            ),
            (eventSource) => Effect.sync(() => eventSource.close()),
        ),
    );
}

function sessionPath(sessionId: string, suffix = "") {
    return `/terminal/sessions/${encodeURIComponent(sessionId)}${suffix}`;
}
