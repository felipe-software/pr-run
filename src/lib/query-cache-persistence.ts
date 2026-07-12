import type {
    PersistedClient,
    Persister,
} from "@tanstack/react-query-persist-client";
import type { Query, QueryKey } from "@tanstack/react-query";
import { del, get, set } from "idb-keyval";

import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1_000;
export const QUERY_CACHE_BUSTER = "pr-run-query-cache-v2";
const QUERY_CACHE_STORAGE_KEY = "pr-run:query-cache:v1";

type QueryCacheStorage = {
    delete: (key: string) => Promise<void>;
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: PersistedClient) => Promise<void>;
};

const indexedDbStorage: QueryCacheStorage = {
    delete: (key) => del(key),
    get: (key) => get(key),
    set: (key, value) => set(key, value),
};

export function createQueryCachePersister(
    storage: QueryCacheStorage = indexedDbStorage,
): Persister {
    return {
        async persistClient(client) {
            try {
                await storage.set(QUERY_CACHE_STORAGE_KEY, client);
            } catch (error) {
                console.warn("Failed to persist the query cache.", error);
            }
        },
        async removeClient() {
            try {
                await storage.delete(QUERY_CACHE_STORAGE_KEY);
            } catch (error) {
                console.warn(
                    "Failed to remove the persisted query cache.",
                    error,
                );
            }
        },
        async restoreClient() {
            try {
                const client = await storage.get(QUERY_CACHE_STORAGE_KEY);
                return isPersistedClient(client) ? client : undefined;
            } catch (error) {
                console.warn(
                    "Failed to restore the persisted query cache.",
                    error,
                );
                return undefined;
            }
        },
    };
}

export const queryCachePersister = createQueryCachePersister();

export function shouldPersistQuery(queryKey: QueryKey) {
    if (sameQueryKey(queryKey, prRunQueryKeys.config)) {
        return true;
    }

    if (sameQueryKey(queryKey, prRunQueryKeys.scripts)) {
        return true;
    }

    if (
        queryKey.length === 3 &&
        queryKey[0] === "pr-run" &&
        queryKey[1] === "overview"
    ) {
        return true;
    }

    if (
        queryKey[0] !== "pr-run" ||
        queryKey[1] !== "project" ||
        typeof queryKey[2] !== "string"
    ) {
        return false;
    }

    if (queryKey.length === 4 && queryKey[3] === "branches") {
        return true;
    }

    if (
        queryKey.length === 6 &&
        queryKey[3] === "branch" &&
        typeof queryKey[4] === "string" &&
        queryKey[5] === "package-scripts"
    ) {
        return true;
    }

    if (
        queryKey.length === 8 &&
        queryKey[3] === "branch" &&
        typeof queryKey[4] === "string" &&
        queryKey[5] === "base" &&
        typeof queryKey[6] === "string" &&
        queryKey[7] === "commits"
    ) {
        return true;
    }

    if (
        queryKey.length === 9 &&
        queryKey[3] === "branch" &&
        typeof queryKey[4] === "string" &&
        queryKey[5] === "base" &&
        typeof queryKey[6] === "string" &&
        queryKey[7] === "diff" &&
        (typeof queryKey[8] === "number" || queryKey[8] === "branch")
    ) {
        return true;
    }

    return (
        queryKey.length === 9 &&
        queryKey[3] === "branch" &&
        typeof queryKey[4] === "string" &&
        queryKey[5] === "base" &&
        typeof queryKey[6] === "string" &&
        queryKey[7] === "activity" &&
        (typeof queryKey[8] === "number" || queryKey[8] === "branch")
    );
}

export function isRefreshingCachedQuery(query: Query) {
    return (
        query.state.fetchStatus === "fetching" &&
        query.state.data !== undefined &&
        shouldPersistQuery(query.queryKey)
    );
}

export function shouldDehydratePrRunQuery(query: Query) {
    return (
        query.state.status === "success" && shouldPersistQuery(query.queryKey)
    );
}

function sameQueryKey(queryKey: QueryKey, expected: QueryKey) {
    return (
        queryKey.length === expected.length &&
        queryKey.every((value, index) => value === expected[index])
    );
}

function isPersistedClient(value: unknown): value is PersistedClient {
    if (!value || typeof value !== "object") {
        return false;
    }

    const client = value as Partial<PersistedClient>;
    if (
        typeof client.timestamp === "number" &&
        typeof client.buster === "string" &&
        Boolean(client.clientState) &&
        typeof client.clientState === "object"
    ) {
        const state = client.clientState as Partial<
            PersistedClient["clientState"]
        >;
        return Array.isArray(state.mutations) && Array.isArray(state.queries);
    }

    return false;
}
