import { normalizeLoopbackHttpUrl } from "@/contracts/local-authority";

const BACKEND_URL_STORAGE_KEY = "pr-run.backend.url";
const DEFAULT_BACKEND_URL = "http://127.0.0.1:33134";

type BackendUrlStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type BrowserBackendUrlOptions = {
    configuredUrl?: string;
    search: string;
    storage: BackendUrlStorage;
};

export function resolveBrowserBackendUrl({
    configuredUrl,
    search,
    storage,
}: BrowserBackendUrlOptions) {
    const queryUrl = readQueryBackendUrl(search);

    if (queryUrl) {
        storage.setItem(BACKEND_URL_STORAGE_KEY, queryUrl);
        return queryUrl;
    }

    const normalizedConfiguredUrl = normalizeLoopbackHttpUrl(configuredUrl);

    if (normalizedConfiguredUrl) {
        return normalizedConfiguredUrl;
    }

    const storedUrl = storage.getItem(BACKEND_URL_STORAGE_KEY);
    const normalizedStoredUrl = normalizeLoopbackHttpUrl(storedUrl);

    if (storedUrl && !normalizedStoredUrl) {
        storage.removeItem(BACKEND_URL_STORAGE_KEY);
    }

    return normalizedStoredUrl ?? DEFAULT_BACKEND_URL;
}

export function requireLoopbackBackendUrl(value: string) {
    const backendUrl = normalizeLoopbackHttpUrl(value);

    if (!backendUrl) {
        throw new Error("The backend URL must be a loopback HTTP origin.");
    }

    return backendUrl;
}

function readQueryBackendUrl(search: string) {
    const params = new URLSearchParams(search);
    const value = params.get("api") ?? params.get("backendUrl");

    return normalizeLoopbackHttpUrl(value);
}
