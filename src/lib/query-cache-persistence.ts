import type {
    PersistedClient,
    Persister,
} from "@tanstack/react-query-persist-client";
import type { Query, QueryKey } from "@tanstack/react-query";
import { del, get, set } from "idb-keyval";

import { tryPromise } from "@/lib/error";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export const QUERY_CACHE_MAX_AGE = 24 * 60 * 60 * 1_000;
export const QUERY_CACHE_BUSTER = "pr-run-query-cache-v2";
const QUERY_CACHE_STORAGE_KEY = "pr-run:query-cache:v1";

type QueryCacheStorage = {
    delete: (key: string) => Promise<void>;
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: PersistedClient) => Promise<void>;
};

type QueryKeySegmentMatcher = (segment: unknown) => boolean;
type QueryKeyPatternSegment = string | number | QueryKeySegmentMatcher;
type QueryKeyPattern = readonly QueryKeyPatternSegment[];

const isStringSegment: QueryKeySegmentMatcher = (segment) =>
    typeof segment === "string";
const isBranchTargetSegment: QueryKeySegmentMatcher = (segment) =>
    segment === "branch" || typeof segment === "number";

const persistedQueryKeyPatterns = [
    prRunQueryKeys.config,
    prRunQueryKeys.scripts,
    ["pr-run", "overview", isStringSegment],
    ["pr-run", "project", isStringSegment, "branches"],
    [
        "pr-run",
        "project",
        isStringSegment,
        "branch",
        isStringSegment,
        "package-scripts",
    ],
    [
        "pr-run",
        "project",
        isStringSegment,
        "branch",
        isStringSegment,
        "base",
        isStringSegment,
        "commits",
    ],
    [
        "pr-run",
        "project",
        isStringSegment,
        "branch",
        isStringSegment,
        "base",
        isStringSegment,
        "diff",
        isBranchTargetSegment,
    ],
    [
        "pr-run",
        "project",
        isStringSegment,
        "branch",
        isStringSegment,
        "base",
        isStringSegment,
        "activity",
        isBranchTargetSegment,
    ],
] satisfies readonly QueryKeyPattern[];

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
            await tryPromise(storage.set(QUERY_CACHE_STORAGE_KEY, client));
        },
        async removeClient() {
            await tryPromise(storage.delete(QUERY_CACHE_STORAGE_KEY));
        },
        async restoreClient() {
            const [, client] = await tryPromise(
                storage.get(QUERY_CACHE_STORAGE_KEY),
            );
            return isPersistedClient(client) ? client : undefined;
        },
    };
}

export const queryCachePersister = createQueryCachePersister();

export function shouldPersistQuery(queryKey: QueryKey) {
    return persistedQueryKeyPatterns.some((pattern) =>
        matchesQueryKeyPattern(queryKey, pattern),
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

function matchesQueryKeyPattern(queryKey: QueryKey, pattern: QueryKeyPattern) {
    return (
        queryKey.length === pattern.length &&
        pattern.every((segmentMatcher, index) =>
            typeof segmentMatcher === "function"
                ? segmentMatcher(queryKey[index])
                : segmentMatcher === queryKey[index],
        )
    );
}

function isPersistedClient(value: unknown): value is PersistedClient {
    return (
        isRecord(value) &&
        typeof value.timestamp === "number" &&
        typeof value.buster === "string" &&
        isRecord(value.clientState) &&
        Array.isArray(value.clientState.mutations) &&
        Array.isArray(value.clientState.queries)
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
