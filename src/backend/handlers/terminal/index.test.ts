import { EventEmitter } from "node:events";
import childProcess, {
    type ChildProcessWithoutNullStreams,
} from "node:child_process";

import { afterEach, describe, expect, test, vi } from "vitest";

import { terminalHandler } from "@/backend/handlers/terminal";

type WorkerRequest = {
    id: string;
    sessionId?: string;
    type: string;
    [key: string]: unknown;
};

type FakeWorker = ChildProcessWithoutNullStreams & {
    requests: WorkerRequest[];
};

function createFakeWorker(
    respond: (request: WorkerRequest, worker: FakeWorker) => unknown = (
        request,
    ) => ({ requestType: request.type }),
) {
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    const requests: WorkerRequest[] = [];
    const worker = new EventEmitter() as FakeWorker;
    let killed = false;

    Object.assign(worker, {
        requests,
        stderr,
        stdout,
        stdin: {
            write(value: string) {
                const request = JSON.parse(value) as WorkerRequest;
                requests.push(request);
                const result = respond(request, worker);

                if (result !== undefined) {
                    queueMicrotask(() => {
                        stdout.emit(
                            "data",
                            `${JSON.stringify({
                                data: result,
                                id: request.id,
                                ok: true,
                                type: "response",
                            })}\n`,
                        );
                    });
                }

                return true;
            },
        },
        kill() {
            killed = true;
            return true;
        },
    });
    Object.defineProperty(worker, "killed", {
        get: () => killed,
    });

    return worker;
}

function installWorker(worker: FakeWorker) {
    return vi
        .spyOn(childProcess, "spawn")
        .mockReturnValue(worker as ChildProcessWithoutNullStreams);
}

async function waitForRequest(worker: FakeWorker, index = 0) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const request = worker.requests[index];

        if (request) {
            return request;
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    throw new Error(`Worker request ${index} was not written.`);
}

afterEach(() => {
    terminalHandler.disposeAll();
    vi.restoreAllMocks();
});

describe("terminal worker protocol", () => {
    test("sends every session request and reuses one live worker", async () => {
        const worker = createFakeWorker((request) => {
            if (request.type === "create") {
                return { id: "session", isAlive: true };
            }

            if (request.type === "snapshot") {
                return { history: "output", id: request.sessionId };
            }

            if (request.type === "state") {
                return { busyState: "idle", id: request.sessionId };
            }

            return { ok: true };
        });
        const spawn = installWorker(worker);

        await expect(
            terminalHandler.createSession({ cols: 80, cwd: "/repo", rows: 24 }),
        ).resolves.toMatchObject({ id: "session", isAlive: true });
        await expect(
            terminalHandler.getSessionSnapshot("session"),
        ).resolves.toMatchObject({ history: "output", id: "session" });
        await expect(
            terminalHandler.getSessionState("session"),
        ).resolves.toMatchObject({ busyState: "idle", id: "session" });
        await terminalHandler.writeInput("session", "bun test\n", {
            source: "script",
        });
        await terminalHandler.resizeSession("session", 120, 40);
        await terminalHandler.disposeSession("session");

        expect(spawn).toHaveBeenCalledTimes(1);
        expect(
            worker.requests.map(({ id: _id, ...request }) => request),
        ).toEqual([
            {
                options: { cols: 80, cwd: "/repo", rows: 24 },
                type: "create",
            },
            { sessionId: "session", type: "snapshot" },
            { sessionId: "session", type: "state" },
            {
                data: "bun test\n",
                options: { source: "script" },
                sessionId: "session",
                type: "input",
            },
            { cols: 120, rows: 40, sessionId: "session", type: "resize" },
            { sessionId: "session", type: "dispose" },
        ]);
    });

    test("maps worker errors and ignores malformed and unknown responses", async () => {
        const worker = createFakeWorker(() => undefined);
        installWorker(worker);

        const notFound = terminalHandler.getSessionState("missing");
        const requestId = (await waitForRequest(worker)).id;
        worker.stdout.emit("data", "not-json\n\n");
        worker.stdout.emit(
            "data",
            `${JSON.stringify({ data: {}, id: "unknown", ok: true, type: "response" })}\n`,
        );
        worker.stdout.emit(
            "data",
            `${JSON.stringify({
                code: "NOT_FOUND",
                details: "worker detail",
                id: requestId,
                message: "Terminal session was not found.",
                ok: false,
                status: 404,
                type: "response",
            })}\n`,
        );

        await expect(notFound).rejects.toMatchObject({
            code: "NOT_FOUND",
            details: "worker detail",
            status: 404,
        });

        const genericFailure = terminalHandler.disposeSession("session");
        const genericRequest = await waitForRequest(worker, 1);
        worker.stdout.emit(
            "data",
            `${JSON.stringify({
                code: "SOMETHING_ELSE",
                id: genericRequest.id,
                message: "worker failed",
                ok: false,
                type: "response",
            })}\n`,
        );

        await expect(genericFailure).rejects.toMatchObject({
            code: "TERMINAL_SESSION_FAILED",
            message: "worker failed",
            status: 500,
        });
    });

    test("buffers partial messages and rejects pending work when the worker exits", async () => {
        const firstWorker = createFakeWorker(() => undefined);
        const secondWorker = createFakeWorker(() => ({ id: "replacement" }));
        const spawn = vi
            .spyOn(childProcess, "spawn")
            .mockReturnValueOnce(firstWorker)
            .mockReturnValueOnce(secondWorker);
        const pending = terminalHandler.createSession({
            cols: 80,
            cwd: "/repo",
            rows: 24,
        });
        const request = await waitForRequest(firstWorker);
        const response = JSON.stringify({
            data: { id: "partial" },
            id: request.id,
            ok: true,
            type: "response",
        });

        firstWorker.stdout.emit("data", response.slice(0, 12));
        firstWorker.emit("exit", 1);

        await expect(pending).rejects.toMatchObject({
            code: "TERMINAL_SESSION_FAILED",
            message: "Terminal worker exited.",
        });
        await expect(
            terminalHandler.createSession({ cols: 2, cwd: "/repo", rows: 2 }),
        ).resolves.toEqual({ id: "replacement" });
        expect(spawn).toHaveBeenCalledTimes(2);
    });

    test("rejects writes that the worker stdin does not accept", async () => {
        const worker = createFakeWorker(() => undefined);
        worker.stdin.write = () => {
            throw new Error("broken pipe");
        };
        installWorker(worker);

        await expect(
            terminalHandler.writeInput("session", "input"),
        ).rejects.toMatchObject({
            code: "TERMINAL_SESSION_FAILED",
            details: "broken pipe",
            message: "Terminal worker did not accept the request.",
        });
    });

    test("forwards worker stderr and stops only a live worker", async () => {
        const worker = createFakeWorker();
        const stderr = vi
            .spyOn(process.stderr, "write")
            .mockImplementation(() => true);
        installWorker(worker);

        await terminalHandler.createSession({
            cols: 80,
            cwd: "/repo",
            rows: 24,
        });
        worker.stderr.emit("data", "warning\n");
        terminalHandler.disposeAll();

        expect(stderr).toHaveBeenCalledWith("[pr-run-terminal] warning\n");
        expect(worker.killed).toBe(true);
        terminalHandler.disposeAll();
    });
});

describe("terminal event streams", () => {
    test("publishes events to multiple subscribers and removes cancelled streams", async () => {
        const worker = createFakeWorker(() => undefined);
        installWorker(worker);
        const firstResponse = terminalHandler.createEventStream("session");
        const secondResponse = terminalHandler.createEventStream("session");
        const first = firstResponse.body!.getReader();
        const second = secondResponse.body!.getReader();
        const decoder = new TextDecoder();

        expect(firstResponse.headers.get("content-type")).toBe(
            "text/event-stream",
        );
        expect(decoder.decode((await first.read()).value)).toContain(
            '"type":"ready","id":"session"',
        );
        await second.read();

        const pending = terminalHandler.getSessionState("session");
        worker.stdout.emit(
            "data",
            `${JSON.stringify({
                event: {
                    busyState: "busy",
                    data: "running",
                    id: "session",
                    sequence: 2,
                    type: "data",
                },
                type: "event",
            })}\n`,
        );

        expect(decoder.decode((await first.read()).value)).toContain("running");
        expect(decoder.decode((await second.read()).value)).toContain(
            "running",
        );
        await first.cancel();
        await second.cancel();
        terminalHandler.disposeAll();
        await expect(pending).rejects.toMatchObject({
            message: "Terminal worker was stopped.",
        });
    });

    test("allows cancelling a stream before any worker exists", async () => {
        const response = terminalHandler.createEventStream("unused");
        const reader = response.body!.getReader();

        await reader.read();
        await reader.cancel();
        terminalHandler.disposeAll();
    });
});
