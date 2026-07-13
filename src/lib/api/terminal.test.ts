import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { terminalApi } from "@/lib/api/terminal";

type EventSourceInstance = {
    close: ReturnType<typeof vi.fn>;
    onmessage: ((event: MessageEvent<string>) => void) | null;
    url: string;
};

const originalEventSource = Object.getOwnPropertyDescriptor(
    globalThis,
    "EventSource",
);
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

function replaceEventSource(value: unknown) {
    Object.defineProperty(globalThis, "EventSource", {
        configurable: true,
        value,
        writable: true,
    });
}

async function waitFor<T>(read: () => T | undefined) {
    for (let attempt = 0; attempt < 30; attempt += 1) {
        const value = read();

        if (value !== undefined) {
            return value;
        }

        await new Promise((resolve) => setTimeout(resolve, 0));
    }

    throw new Error("The terminal event stream did not settle.");
}

beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            prRun: {
                getBackendUrl: async () => "http://127.0.0.1:33134",
            },
        },
        writable: true,
    });
});

afterEach(() => {
    if (originalEventSource) {
        Object.defineProperty(globalThis, "EventSource", originalEventSource);
    } else {
        Reflect.deleteProperty(globalThis, "EventSource");
    }

    if (originalWindow) {
        Object.defineProperty(globalThis, "window", originalWindow);
    } else {
        Reflect.deleteProperty(globalThis, "window");
    }

    vi.restoreAllMocks();
});

describe("terminal event API", () => {
    test("encodes the session URL, forwards messages, and closes on unsubscribe", async () => {
        const instances: EventSourceInstance[] = [];

        class FakeEventSource {
            close = vi.fn();
            onmessage: ((event: MessageEvent<string>) => void) | null = null;
            url: string;

            constructor(url: string) {
                this.url = url;
                instances.push(this);
            }
        }

        replaceEventSource(FakeEventSource);
        const onMessage = vi.fn();
        const onError = vi.fn();
        const unsubscribe = terminalApi.subscribeTerminalEvents(
            "session / one",
            onMessage,
            onError,
        );
        const source = await waitFor(() => instances[0]);

        expect(
            source.url.endsWith(
                "/terminal/sessions/session%20%2F%20one/events",
            ),
        ).toBe(true);
        source.onmessage!({ data: "first chunk" } as MessageEvent<string>);
        await waitFor(() =>
            onMessage.mock.calls.length > 0
                ? onMessage.mock.calls[0]?.[0]
                : undefined,
        );
        expect(onMessage).toHaveBeenCalledWith("first chunk");
        expect(onError).not.toHaveBeenCalled();

        unsubscribe();
        await waitFor(() =>
            source.close.mock.calls.length ? true : undefined,
        );
        expect(source.close).toHaveBeenCalledTimes(1);
    });

    test("reports EventSource construction failures", async () => {
        class BrokenEventSource {
            constructor() {
                throw new Error("events unavailable");
            }
        }

        replaceEventSource(BrokenEventSource);
        const onError = vi.fn();
        const unsubscribe = terminalApi.subscribeTerminalEvents(
            "session",
            vi.fn(),
            onError,
        );

        const error = await waitFor(() => onError.mock.calls[0]?.[0]);
        expect(error).toMatchObject({ message: "events unavailable" });
        unsubscribe();
    });

    test("reports consumer callback failures and releases the source", async () => {
        let source: EventSourceInstance | undefined;

        class FakeEventSource {
            close = vi.fn();
            onmessage: ((event: MessageEvent<string>) => void) | null = null;
            url: string;

            constructor(url: string) {
                this.url = url;
                source = this;
            }
        }

        replaceEventSource(FakeEventSource);
        const onError = vi.fn();
        const unsubscribe = terminalApi.subscribeTerminalEvents(
            "session",
            () => {
                throw new Error("consumer failed");
            },
            onError,
        );
        const activeSource = await waitFor(() => source);

        activeSource.onmessage!({ data: "chunk" } as MessageEvent<string>);
        const error = await waitFor(() => onError.mock.calls[0]?.[0]);
        expect(error).toMatchObject({ message: "consumer failed" });
        await waitFor(() =>
            activeSource.close.mock.calls.length ? true : undefined,
        );
        unsubscribe();
    });
});
