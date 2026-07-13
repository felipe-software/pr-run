import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    clearSshPassphrase,
    createApiError,
    getBackendUrl,
    isHandledSshPromptError,
    parseEnvelope,
    requestMany,
    requestOne,
    resolveGitHubMediaUrl,
    saveSshPassphrase,
    sendRaw,
    toApiUrl,
} from "@/lib/api/transport";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import type { ApiEnvelope } from "@/types/pr-run";

const BACKEND_URL = "http://127.0.0.1:43134";
const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

function success<T>(data: T[], message = "ok"): ApiEnvelope<T> {
    return { _metadata: {}, data, message, type: "success" };
}

function jsonResponse(payload: ApiEnvelope<unknown>, init: ResponseInit = {}) {
    return new Response(JSON.stringify(payload), {
        headers: { "content-type": "application/json" },
        ...init,
    });
}

function replaceGlobal(name: "fetch" | "window", value: unknown) {
    Object.defineProperty(globalThis, name, {
        configurable: true,
        value,
        writable: true,
    });
}

function restoreGlobal(
    name: "fetch" | "window",
    descriptor?: PropertyDescriptor,
) {
    if (descriptor) {
        Object.defineProperty(globalThis, name, descriptor);
    } else {
        Reflect.deleteProperty(globalThis, name);
    }
}

beforeEach(() => {
    replaceGlobal("window", {
        location: { search: "" },
        prRun: { getBackendUrl: async () => BACKEND_URL },
    });
    useSshPassphraseStore.getState().close();
});

afterEach(() => {
    restoreGlobal("fetch", originalFetch);
    restoreGlobal("window", originalWindow);
    useSshPassphraseStore.getState().close();
    vi.restoreAllMocks();
});

describe("transport URL resolution", () => {
    test("resolves and caches the Electron loopback backend", async () => {
        expect(await getBackendUrl()).toBe(BACKEND_URL);
        expect(await getBackendUrl()).toBe(BACKEND_URL);
        expect(await toApiUrl("/projects?value=one")).toBe(
            `${BACKEND_URL}/projects?value=one`,
        );
        expect(await toApiUrl("https://example.com/path")).toBe(
            "https://example.com/path",
        );
    });

    test("proxies only GitHub attachment URLs", async () => {
        const source =
            "https://github.com/user-attachments/assets/12345678-1234-1234-1234-123456789abc";

        expect(await resolveGitHubMediaUrl(source)).toBe(
            `${BACKEND_URL}/github/media?url=${encodeURIComponent(source)}`,
        );
        expect(
            await resolveGitHubMediaUrl("https://example.com/image.png"),
        ).toBe("https://example.com/image.png");
    });
});

describe("API envelopes", () => {
    test("parses valid envelopes and ignores invalid JSON", async () => {
        expect(
            await parseEnvelope<string>(jsonResponse(success(["value"]))),
        ).toEqual(success(["value"]));
        expect(
            await parseEnvelope(new Response("not json", { status: 500 })),
        ).toBeNull();
    });

    test("creates errors with metadata and message fallbacks", () => {
        const error = createApiError(
            new Response(null, { status: 409, statusText: "Conflict" }),
            {
                _metadata: {
                    action: "retry",
                    code: "CONFLICT",
                    details: { current: 1 },
                    ignored: 42,
                },
                data: [],
                message: "Custom conflict",
                type: "error",
            },
        );

        expect(error).toMatchObject({
            action: "retry",
            code: "CONFLICT",
            details: { current: 1 },
            message: "Custom conflict",
            status: 409,
        });
        expect(
            createApiError(
                new Response(null, {
                    status: 500,
                    statusText: "Server exploded",
                }),
                null,
            ).message,
        ).toBe("Server exploded");
        expect(
            createApiError(new Response(null, { status: 500 }), null).message,
        ).toBe("Local API request failed.");
    });

    test("returns one and many response items through the real HTTP client", async () => {
        const fetch = vi.fn(async () => jsonResponse(success(["one", "two"])));
        replaceGlobal("fetch", fetch);

        expect(await requestOne<string>("/items")).toBe("one");
        expect(await requestMany<string>("/items")).toEqual(["one", "two"]);
        const request = fetch.mock.calls[0]?.[0] as Request;
        expect(request.url).toBe(`${BACKEND_URL}/items`);
    });

    test("rejects empty success and explicit error envelopes", async () => {
        const fetch = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse(success([], "Nothing here")))
            .mockResolvedValueOnce(
                jsonResponse(
                    {
                        _metadata: { code: "NOT_FOUND", details: "missing" },
                        data: [],
                        message: "Missing item",
                        type: "error",
                    },
                    { status: 404, statusText: "Not Found" },
                ),
            );
        replaceGlobal("fetch", fetch);

        await expect(requestOne("/empty")).rejects.toThrow("Nothing here");
        await expect(requestOne("/missing")).rejects.toMatchObject({
            code: "NOT_FOUND",
            details: "missing",
            message: "Missing item",
            status: 404,
        });
    });

    test("sends raw requests without envelope validation", async () => {
        const fetch = vi.fn(async () => new Response("raw", { status: 503 }));
        replaceGlobal("fetch", fetch);

        const response = await sendRaw("/raw", { method: "POST" });

        expect(response.status).toBe(503);
        expect(await response.text()).toBe("raw");
    });
});

describe("SSH prompt transport", () => {
    test("identifies only handled SSH prompt errors", () => {
        expect(
            isHandledSshPromptError({
                code: "SSH_AUTH_REQUIRED",
                handledBySshPrompt: true,
            }),
        ).toBe(true);
        expect(
            isHandledSshPromptError({
                action: "prompt_ssh_passphrase",
                handledBySshPrompt: false,
            }),
        ).toBe(false);
        expect(isHandledSshPromptError(null)).toBe(false);
        expect(isHandledSshPromptError("error")).toBe(false);
    });

    test("captures a failed request and marks the error as prompt-handled", async () => {
        const fetch = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse(
                    {
                        _metadata: {
                            action: "prompt_ssh_passphrase",
                            code: "SSH_AUTH_REQUIRED",
                        },
                        data: [],
                        message: "Passphrase required",
                        type: "error",
                    },
                    { status: 401 },
                ),
            )
            .mockResolvedValueOnce(jsonResponse(success([{ ok: true }])));
        replaceGlobal("fetch", fetch);

        await expect(
            requestOne("/projects", {
                body: JSON.stringify({ branch: "feature" }),
                headers: { "content-type": "application/json" },
                method: "POST",
            }),
        ).rejects.toMatchObject({
            code: "SSH_AUTH_REQUIRED",
            handledBySshPrompt: true,
        });

        expect(useSshPassphraseStore.getState()).toMatchObject({
            isOpen: true,
            pendingRequest: {
                body: JSON.stringify({ branch: "feature" }),
                contentType: "application/json",
                method: "POST",
                url: `${BACKEND_URL}/projects`,
            },
        });
        expect((fetch.mock.calls[1]?.[0] as Request).url).toBe(
            `${BACKEND_URL}/ssh-passphrase/clear`,
        );
    });

    test("validates an empty passphrase without making a request", async () => {
        const fetch = vi.fn();
        replaceGlobal("fetch", fetch);
        useSshPassphraseStore.getState().open(null);

        expect(await saveSshPassphrase()).toBe(false);
        expect(useSshPassphraseStore.getState().error).toBe(
            "Enter the SSH passphrase.",
        );
        expect(fetch).not.toHaveBeenCalled();
    });

    test("saves a passphrase, runs retry actions, and closes the prompt", async () => {
        let requestBody: unknown;
        const fetch = vi.fn(async (input: RequestInfo | URL) => {
            requestBody = await (input as Request).clone().json();
            return jsonResponse(success([{ ok: true }]));
        });
        const retryOne = vi.fn(async () => {});
        const retryTwo = vi.fn(async () => {});
        replaceGlobal("fetch", fetch);
        const store = useSshPassphraseStore.getState();
        store.open(null);
        useSshPassphraseStore.getState().setPassphrase("secret");
        useSshPassphraseStore.getState().setRetryAction("one", retryOne);
        useSshPassphraseStore.getState().setRetryAction("two", retryTwo);

        expect(await saveSshPassphrase()).toBe(true);
        expect(retryOne).toHaveBeenCalledTimes(1);
        expect(retryTwo).toHaveBeenCalledTimes(1);
        expect(useSshPassphraseStore.getState()).toMatchObject({
            isOpen: false,
            isSaving: false,
            passphrase: "",
            pendingRequest: null,
        });
        const request = fetch.mock.calls[0]?.[0] as Request;
        expect(request.url).toBe(`${BACKEND_URL}/ssh-passphrase`);
        expect(requestBody).toEqual({ passphrase: "secret" });
    });

    test("exposes the clear passphrase response", async () => {
        const fetch = vi.fn(async () => jsonResponse(success([{ ok: true }])));
        replaceGlobal("fetch", fetch);

        expect(await clearSshPassphrase()).toEqual({ ok: true });
    });
});
