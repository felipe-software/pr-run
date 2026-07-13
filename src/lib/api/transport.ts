import ky, { type AfterResponseState, type Options } from "ky";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";

import {
    requireLoopbackBackendUrl,
    resolveBrowserBackendUrl,
} from "@/lib/api/backend-url";
import type { ApiEnvelope, SshPassphraseResult } from "@/types/pr-run";
import {
    type PendingRequest,
    useSshPassphraseStore,
} from "@/lib/hooks/store/use-ssh-passphrase-store";
import { tryPromise } from "@/lib/error";
import { runManagedEffect } from "@/runtime/run-effect";

type ApiError = Error & {
    action?: string;
    code?: string;
    details?: unknown;
    handledBySshPrompt?: boolean;
    metadata?: Record<string, unknown>;
    status?: number;
};

type PrRunHttpClientService = {
    request(
        pathOrUrl: string,
        options?: Options,
    ): Effect.Effect<Response, unknown>;
    requestRaw(
        pathOrUrl: string,
        options?: Options,
    ): Effect.Effect<Response, unknown>;
};

class PrRunHttpClient extends Context.Tag("pr-run/client/PrRunHttpClient")<
    PrRunHttpClient,
    PrRunHttpClientService
>() {}

const api = ky.create({
    hooks: {
        afterResponse: [
            async ({ request, response }: AfterResponseState) => {
                const payload = await parseEnvelope(response);

                if (response.ok && payload?.type !== "error") {
                    return response;
                }

                const error = createApiError(response, payload);

                if (isSshPromptError(error)) {
                    await clearSshPassphraseCache();
                    useSshPassphraseStore
                        .getState()
                        .open(await capturePendingRequest(request));
                    error.handledBySshPrompt = true;
                }

                throw error;
            },
        ],
    },
    throwHttpErrors: false,
});

const rawApi = ky.create({ throwHttpErrors: false });
const clientLayer = Layer.succeed(
    PrRunHttpClient,
    PrRunHttpClient.of({
        request: (pathOrUrl, options) =>
            Effect.tryPromise({
                catch: (error) => error,
                try: async () => api(await toApiUrl(pathOrUrl), options),
            }).pipe(Effect.withSpan("PrRunHttpClient.request")),
        requestRaw: (pathOrUrl, options) =>
            Effect.tryPromise({
                catch: (error) => error,
                try: async () => rawApi(await toApiUrl(pathOrUrl), options),
            }).pipe(Effect.withSpan("PrRunHttpClient.requestRaw")),
    }),
);

export const clientRuntime = ManagedRuntime.make(clientLayer);

let backendUrlPromise: Promise<string> | null = null;

export function getBackendUrl() {
    backendUrlPromise ??= resolveBackendUrl();
    return backendUrlPromise;
}

export async function resolveGitHubMediaUrl(sourceUrl: string) {
    if (!sourceUrl.startsWith("https://github.com/user-attachments/assets/")) {
        return sourceUrl;
    }

    const backendUrl = await getBackendUrl();
    return `${backendUrl}/github/media?${new URLSearchParams({ url: sourceUrl })}`;
}

export async function toApiUrl(pathOrUrl: string) {
    if (isAbsoluteUrl(pathOrUrl)) {
        return pathOrUrl;
    }

    return new URL(pathOrUrl, await getBackendUrl()).toString();
}

export async function sendRaw(pathOrUrl: string, options?: Options) {
    return runManagedEffect(
        clientRuntime,
        Effect.flatMap(PrRunHttpClient, (client) =>
            client.requestRaw(pathOrUrl, options),
        ),
    );
}

async function requestEnvelope<T>(pathOrUrl: string, options?: Options) {
    const response = await send(pathOrUrl, options);
    const payload = (await response.json()) as ApiEnvelope<T>;

    if (payload.type === "error") {
        throw createApiError(response, payload);
    }

    return payload;
}

export async function requestOne<T>(pathOrUrl: string, options?: Options) {
    const payload = await requestEnvelope<T>(pathOrUrl, options);
    const item = payload.data[0];

    if (item === undefined) {
        throw new Error(payload.message || "Local API returned no data.");
    }

    return item;
}

export async function requestMany<T>(pathOrUrl: string, options?: Options) {
    return (await requestEnvelope<T>(pathOrUrl, options)).data;
}

async function requestOneRaw<T>(pathOrUrl: string, options?: Options) {
    const response = await sendRaw(pathOrUrl, options);
    const payload = (await response.json()) as ApiEnvelope<T>;

    if (!response.ok || payload.type === "error") {
        throw createApiError(response, payload);
    }

    const item = payload.data[0];

    if (item === undefined) {
        throw new Error(payload.message || "Local API returned no data.");
    }

    return item;
}

export async function parseEnvelope<T>(response: Response) {
    const [error, payload] = await tryPromise(
        response.clone().json() as Promise<ApiEnvelope<T>>,
    );
    return error ? null : payload;
}

export function createApiError(
    response: Response,
    payload: ApiEnvelope<unknown> | null,
): ApiError {
    const error = new Error(
        payload?.message || response.statusText || "Local API request failed.",
    ) as ApiError;

    error.action = metadataString(payload, "action");
    error.code = metadataString(payload, "code");
    error.details = payload?._metadata?.details;
    error.metadata = payload?._metadata;
    error.status = response.status;
    return error;
}

function isSshPromptError(error: unknown) {
    return (
        errorProperty(error, "code") === "SSH_AUTH_REQUIRED" ||
        errorProperty(error, "action") === "prompt_ssh_passphrase"
    );
}

export function isHandledSshPromptError(error: unknown) {
    return (
        isSshPromptError(error) &&
        errorProperty(error, "handledBySshPrompt") === true
    );
}

export async function saveSshPassphrase() {
    const store = useSshPassphraseStore.getState();

    if (!store.passphrase) {
        store.setError("Enter the SSH passphrase.");
        return false;
    }

    store.setSaving(true);
    store.setError(undefined);
    const [error] = await tryPromise(
        savePassphraseAndRetryRequests(store.passphrase),
    );

    if (error) {
        if (!isHandledSshPromptError(error)) {
            store.setError(errorMessage(error));
        }
        useSshPassphraseStore.getState().setSaving(false);
        return false;
    }

    useSshPassphraseStore.getState().close();
    useSshPassphraseStore.getState().setSaving(false);
    return true;
}

export function clearSshPassphrase() {
    return requestOneRaw<SshPassphraseResult>("/ssh-passphrase/clear", {
        method: "POST",
    });
}

async function send(pathOrUrl: string, options?: Options) {
    return runManagedEffect(
        clientRuntime,
        Effect.flatMap(PrRunHttpClient, (client) =>
            client.request(pathOrUrl, options),
        ),
    );
}

async function resolveBackendUrl() {
    if (window.prRun) {
        return requireLoopbackBackendUrl(await window.prRun.getBackendUrl());
    }

    return resolveBrowserBackendUrl({
        configuredUrl: import.meta.env.VITE_PR_RUN_BACKEND_URL,
        search: window.location.search,
        storage: localStorage,
    });
}

function tryUrl(value: string): [Error, null] | [null, URL] {
    try {
        return [null, new URL(value)];
    } catch (error) {
        return [
            error instanceof Error ? error : new Error(String(error)),
            null,
        ];
    }
}

function isAbsoluteUrl(value: string) {
    return tryUrl(value)[0] === null;
}

function metadataString(payload: ApiEnvelope<unknown> | null, key: string) {
    const value = payload?._metadata?.[key];
    return typeof value === "string" ? value : undefined;
}

function errorProperty(error: unknown, property: string): unknown {
    if (typeof error !== "object" || error === null || !(property in error)) {
        return undefined;
    }

    return (error as Record<string, unknown>)[property];
}

async function capturePendingRequest(
    request: Request,
): Promise<PendingRequest> {
    const cloned = request.clone();
    const body = await cloned.text();

    return {
        body: body || undefined,
        contentType: cloned.headers.get("content-type") ?? undefined,
        method: cloned.method,
        url: cloned.url,
    };
}

async function clearSshPassphraseCache() {
    await tryPromise(clearSshPassphrase());
}

async function savePassphraseAndRetryRequests(passphrase: string) {
    await requestOneRaw<SshPassphraseResult>("/ssh-passphrase", {
        json: { passphrase },
        method: "POST",
    });

    const { pendingRequest, retryActions } = useSshPassphraseStore.getState();
    const actions = Object.values(retryActions);

    if (actions.length > 0) {
        await Promise.all(actions.map((action) => action()));
    } else if (pendingRequest) {
        await requestEnvelope(pendingRequest.url, {
            body: pendingRequest.body,
            headers: pendingRequest.contentType
                ? { "content-type": pendingRequest.contentType }
                : undefined,
            method: pendingRequest.method,
        });
    }
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}
