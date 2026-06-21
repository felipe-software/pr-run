import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";

import { tryPromise } from "@/backend/handlers/error";
import {
    ApiError,
    type TerminalCreateOptions,
    type TerminalDataEvent,
    type TerminalExitEvent,
    type TerminalInputOptions,
    type TerminalSession,
    type TerminalSessionSnapshot,
} from "@/backend/types";

type TerminalStreamEvent =
    | ({ type: "data" } & TerminalDataEvent)
    | ({ type: "exit" } & TerminalExitEvent);

type TerminalWorkerRequest =
    | { id: string; type: "create"; options: TerminalCreateOptions }
    | { id: string; type: "snapshot"; sessionId: string }
    | { id: string; type: "state"; sessionId: string }
    | {
          id: string;
          type: "input";
          sessionId: string;
          data: string;
          options?: TerminalInputOptions;
      }
    | {
          id: string;
          type: "resize";
          sessionId: string;
          cols: number;
          rows: number;
      }
    | { id: string; type: "dispose"; sessionId: string };

type TerminalWorkerMessage =
    | {
          type: "response";
          id: string;
          ok: true;
          data: unknown;
      }
    | {
          type: "response";
          id: string;
          ok: false;
          code?: string;
          details?: string;
          message: string;
          status?: number;
      }
    | { type: "event"; event: TerminalStreamEvent };

type PendingWorkerRequest = {
    reject: (error: Error) => void;
    resolve: (data: unknown) => void;
};

type TerminalSubscriber = {
    send: (event: TerminalStreamEvent) => void;
};

const workerPath = fileURLToPath(new URL("./pty-worker.cjs", import.meta.url));
const pendingRequests = new Map<string, PendingWorkerRequest>();
const subscribers = new Map<string, Set<TerminalSubscriber>>();

let workerProcess: ChildProcessWithoutNullStreams | null = null;
let stdoutBuffer = "";

function createSession(
    options: TerminalCreateOptions,
): Promise<TerminalSession> {
    return requestWorker<TerminalSession>({
        id: crypto.randomUUID(),
        options,
        type: "create",
    });
}

function getSessionSnapshot(
    sessionId: string,
): Promise<TerminalSessionSnapshot> {
    return requestWorker<TerminalSessionSnapshot>({
        id: crypto.randomUUID(),
        sessionId,
        type: "snapshot",
    });
}

function getSessionState(sessionId: string) {
    return requestWorker<
        Pick<
            TerminalSessionSnapshot,
            "busyState" | "currentProcess" | "id" | "isAlive" | "sequence"
        >
    >({
        id: crypto.randomUUID(),
        sessionId,
        type: "state",
    });
}

async function writeInput(
    sessionId: string,
    data: string,
    options?: TerminalInputOptions,
) {
    await requestWorker({
        data,
        id: crypto.randomUUID(),
        options,
        sessionId,
        type: "input",
    });
}

async function resizeSession(sessionId: string, cols: number, rows: number) {
    await requestWorker({
        cols,
        id: crypto.randomUUID(),
        rows,
        sessionId,
        type: "resize",
    });
}

async function disposeSession(sessionId: string) {
    await requestWorker({
        id: crypto.randomUUID(),
        sessionId,
        type: "dispose",
    });
}

function disposeAll() {
    for (const pendingRequest of pendingRequests.values()) {
        pendingRequest.reject(
            new ApiError(
                "TERMINAL_SESSION_FAILED",
                "Terminal worker was stopped.",
                500,
            ),
        );
    }

    pendingRequests.clear();

    if (workerProcess && !workerProcess.killed) {
        workerProcess.kill();
    }

    workerProcess = null;
    subscribers.clear();
}

function createEventStream(id: string) {
    const encoder = new TextEncoder();
    let subscriber: TerminalSubscriber | null = null;

    return new Response(
        new ReadableStream<Uint8Array>({
            start(controller) {
                subscriber = {
                    send(event) {
                        controller.enqueue(
                            encoder.encode(
                                `data: ${JSON.stringify(event)}\n\n`,
                            ),
                        );
                    },
                };

                addSubscriber(id, subscriber);
                controller.enqueue(
                    encoder.encode(
                        `data: ${JSON.stringify({ type: "ready", id })}\n\n`,
                    ),
                );
            },
            cancel() {
                if (subscriber) {
                    removeSubscriber(id, subscriber);
                }
            },
        }),
        {
            headers: {
                "cache-control": "no-cache",
                connection: "keep-alive",
                "content-type": "text/event-stream",
            },
        },
    );
}

async function requestWorker<T>(request: TerminalWorkerRequest): Promise<T> {
    const worker = ensureWorker();

    const responsePromise = new Promise<T>((resolve, reject) => {
        pendingRequests.set(request.id, {
            reject,
            resolve: (data) => {
                resolve(data as T);
            },
        });
    });

    const [writeError] = await tryPromise(
        Promise.resolve().then(() => {
            worker.stdin.write(`${JSON.stringify(request)}\n`);
        }),
    );

    if (writeError) {
        pendingRequests.delete(request.id);
        throw new ApiError(
            "TERMINAL_SESSION_FAILED",
            "Terminal worker did not accept the request.",
            500,
            writeError.message,
        );
    }

    return responsePromise;
}

function ensureWorker() {
    if (workerProcess && !workerProcess.killed) {
        return workerProcess;
    }

    workerProcess = spawn("node", [workerPath], {
        cwd: process.cwd(),
        env: process.env,
    });
    stdoutBuffer = "";

    workerProcess.stdout.on("data", (chunk) => {
        handleWorkerStdout(String(chunk));
    });

    workerProcess.stderr.on("data", (chunk) => {
        process.stderr.write(`[pr-run-terminal] ${chunk}`);
    });

    workerProcess.once("exit", () => {
        workerProcess = null;
        stdoutBuffer = "";

        for (const pendingRequest of pendingRequests.values()) {
            pendingRequest.reject(
                new ApiError(
                    "TERMINAL_SESSION_FAILED",
                    "Terminal worker exited.",
                    500,
                ),
            );
        }

        pendingRequests.clear();
    });

    return workerProcess;
}

function handleWorkerStdout(chunk: string) {
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() ?? "";

    for (const line of lines) {
        if (!line.trim()) {
            continue;
        }

        parseWorkerMessage(line);
    }
}

async function parseWorkerMessage(line: string) {
    const [error, message] = await tryPromise(
        Promise.resolve().then(() => JSON.parse(line) as TerminalWorkerMessage),
    );

    if (error) {
        return;
    }

    if (message.type === "event") {
        publish(message.event.id, message.event);
        return;
    }

    const pendingRequest = pendingRequests.get(message.id);

    if (!pendingRequest) {
        return;
    }

    pendingRequests.delete(message.id);

    if (message.ok) {
        pendingRequest.resolve(message.data);
        return;
    }

    pendingRequest.reject(
        new ApiError(
            message.code === "BAD_REQUEST" || message.code === "NOT_FOUND"
                ? message.code
                : "TERMINAL_SESSION_FAILED",
            message.message,
            message.status ?? 500,
            message.details,
        ),
    );
}

function addSubscriber(id: string, subscriber: TerminalSubscriber) {
    const sessionSubscribers = subscribers.get(id) ?? new Set();
    sessionSubscribers.add(subscriber);
    subscribers.set(id, sessionSubscribers);
}

function removeSubscriber(id: string, subscriber: TerminalSubscriber) {
    const sessionSubscribers = subscribers.get(id);

    if (!sessionSubscribers) {
        return;
    }

    sessionSubscribers.delete(subscriber);

    if (sessionSubscribers.size === 0) {
        subscribers.delete(id);
    }
}

function publish(id: string, event: TerminalStreamEvent) {
    const sessionSubscribers = subscribers.get(id);

    if (!sessionSubscribers) {
        return;
    }

    for (const subscriber of sessionSubscribers) {
        subscriber.send(event);
    }
}

export const terminalHandler = {
    createEventStream,
    createSession,
    disposeAll,
    disposeSession,
    getSessionSnapshot,
    getSessionState,
    resizeSession,
    writeInput,
};
