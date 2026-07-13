import { describe, expect, test, vi } from "vitest";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import {
    persistQueryClientRestore,
    type PersistedClient,
} from "@tanstack/react-query-persist-client";

import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";
import {
    createQueryCachePersister,
    isRefreshingCachedQuery,
    QUERY_CACHE_BUSTER,
    QUERY_CACHE_MAX_AGE,
    shouldDehydratePrRunQuery,
    shouldPersistQuery,
} from "@/lib/query-cache-persistence";

describe("shouldPersistQuery", () => {
    test("allows safe metadata and Git query families", () => {
        const allowedKeys = [
            prRunQueryKeys.config,
            prRunQueryKeys.overview(),
            prRunQueryKeys.overview("project-1"),
            prRunQueryKeys.scripts,
            prRunQueryKeys.branches("project-1"),
            prRunQueryKeys.commits("project-1", "feature", "main"),
            prRunQueryKeys.diff("project-1", "feature", "main"),
            prRunQueryKeys.diff("project-1", "feature", "main", 42),
            prRunQueryKeys.activity("project-1", "feature", "main"),
            prRunQueryKeys.activity("project-1", "feature", "main", 42),
            prRunQueryKeys.packageScripts("project-1", "feature"),
        ];

        for (const queryKey of allowedKeys) {
            expect(shouldPersistQuery(queryKey)).toBe(true);
        }
    });

    test("requires exact key shapes", () => {
        const malformedKeys = [
            [...prRunQueryKeys.config, "extra"],
            [...prRunQueryKeys.scripts, "extra"],
            ["pr-run", "overview"],
            ["pr-run", "overview", 42],
            ["pr-run", "overview", "project-1", "extra"],
            ["pr-run", "project", 42, "branches"],
            ["pr-run", "project", "project-1", "branches", "extra"],
            ["pr-run", "project", "project-1", "branch", 42, "package-scripts"],
            [
                "pr-run",
                "project",
                "project-1",
                "branch",
                "feature",
                "base",
                42,
                "commits",
            ],
            [
                "pr-run",
                "project",
                "project-1",
                "branch",
                "feature",
                "base",
                "main",
                "diff",
            ],
            [
                "pr-run",
                "project",
                "project-1",
                "branch",
                "feature",
                "base",
                "main",
                "diff",
                "pull-request",
            ],
            [
                "pr-run",
                "project",
                "project-1",
                "branch",
                "feature",
                "base",
                "main",
                "activity",
                {},
            ],
        ];

        for (const queryKey of malformedKeys) {
            expect(shouldPersistQuery(queryKey)).toBe(false);
        }
    });

    test("rejects secrets, live state, script source, and unknown keys", () => {
        const rejectedKeys = [
            prRunQueryKeys.env("project-1", "feature"),
            prRunQueryKeys.docker("project-1", "feature"),
            prRunQueryKeys.scriptSource("script-1"),
            prRunQueryKeys.terminal("session-1"),
            prRunQueryKeys.terminalState("session-1"),
            prRunQueryKeys.file("project-1", "feature", "src/main.ts"),
            prRunQueryKeys.commitDiff("project-1", "abc123"),
            ["pr-run", "unknown"],
            ["another-app", "config"],
        ];

        for (const queryKey of rejectedKeys) {
            expect(shouldPersistQuery(queryKey)).toBe(false);
        }
    });

    test("dehydrates only successful allowed queries", async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const successfulKey = prRunQueryKeys.branches("project-1");
        const errorKey = prRunQueryKeys.diff("project-1", "feature", "main");
        const pendingKey = prRunQueryKeys.activity(
            "project-1",
            "feature",
            "main",
        );
        const neverResolves = new Promise(() => undefined);

        queryClient.setQueryData(successfulKey, []);
        await expect(
            queryClient.fetchQuery({
                queryFn: () => Promise.reject(new Error("failed")),
                queryKey: errorKey,
            }),
        ).rejects.toThrow("failed");
        queryClient.fetchQuery({
            queryFn: () => neverResolves,
            queryKey: pendingKey,
        });

        const successfulQuery = queryClient.getQueryCache().find({
            queryKey: successfulKey,
        });
        const errorQuery = queryClient.getQueryCache().find({
            queryKey: errorKey,
        });
        const pendingQuery = queryClient.getQueryCache().find({
            queryKey: pendingKey,
        });

        expect(
            successfulQuery && shouldDehydratePrRunQuery(successfulQuery),
        ).toBe(true);
        expect(errorQuery && shouldDehydratePrRunQuery(errorQuery)).toBe(false);
        expect(pendingQuery && shouldDehydratePrRunQuery(pendingQuery)).toBe(
            false,
        );
    });
});

describe("query cache persister", () => {
    test("round trips a valid persisted client", async () => {
        let stored: PersistedClient | undefined;
        const persister = createQueryCachePersister({
            delete: async () => {
                stored = undefined;
            },
            get: async () => stored,
            set: async (_key, value) => {
                stored = value;
            },
        });
        const client = createPersistedClient();

        await persister.persistClient(client);

        expect(await persister.restoreClient()).toEqual(client);
    });

    test("ignores malformed persisted clients", async () => {
        const validClient = createPersistedClient();
        const malformedClients = [
            null,
            {},
            { ...validClient, timestamp: "invalid" },
            { ...validClient, buster: 42 },
            { ...validClient, clientState: null },
            {
                ...validClient,
                clientState: {
                    ...validClient.clientState,
                    mutations: {},
                },
            },
            {
                ...validClient,
                clientState: {
                    ...validClient.clientState,
                    queries: {},
                },
            },
        ];

        for (const client of malformedClients) {
            const persister = createQueryCachePersister({
                delete: async () => undefined,
                get: async () => client,
                set: async () => undefined,
            });

            expect(await persister.restoreClient()).toBeUndefined();
        }
    });

    test("ignores unavailable storage", async () => {
        const warning = vi
            .spyOn(console, "warn")
            .mockImplementation(() => undefined);
        const unavailablePersister = createQueryCachePersister({
            delete: async () => {
                throw new Error("IndexedDB unavailable");
            },
            get: async () => {
                throw new Error("IndexedDB unavailable");
            },
            set: async () => {
                throw new Error("IndexedDB unavailable");
            },
        });

        expect(await unavailablePersister.restoreClient()).toBeUndefined();
        await expect(
            unavailablePersister.persistClient(createPersistedClient()),
        ).resolves.toBeUndefined();
        await expect(
            unavailablePersister.removeClient(),
        ).resolves.toBeUndefined();
        expect(warning).toHaveBeenCalledTimes(3);
        warning.mockRestore();
    });

    test("TanStack removes expired and busted snapshots", async () => {
        for (const snapshot of [
            createPersistedClient({ timestamp: Date.now() - 1_000 }),
            createPersistedClient({ buster: "old-schema" }),
        ]) {
            let wasRemoved = false;
            const queryClient = new QueryClient();

            await persistQueryClientRestore({
                buster: QUERY_CACHE_BUSTER,
                maxAge:
                    snapshot.buster === QUERY_CACHE_BUSTER
                        ? 100
                        : QUERY_CACHE_MAX_AGE,
                persister: {
                    persistClient: async () => undefined,
                    removeClient: async () => {
                        wasRemoved = true;
                    },
                    restoreClient: async () => snapshot,
                },
                queryClient,
            });

            expect(wasRemoved).toBe(true);
        }
    });
});

describe("restored query behavior", () => {
    test("keeps cached data visible while replacing it in the background", async () => {
        const queryClient = new QueryClient();
        const queryKey = prRunQueryKeys.branches("project-1");
        let resolveFetch: (value: string[]) => void = () => undefined;
        const nextData = new Promise<string[]>((resolve) => {
            resolveFetch = resolve;
        });

        queryClient.setQueryData(queryKey, ["cached"]);
        const fetch = queryClient.fetchQuery({
            queryFn: () => nextData,
            queryKey,
            staleTime: 0,
        });
        const query = queryClient.getQueryCache().find({ queryKey });

        expect(queryClient.getQueryData(queryKey)).toEqual(["cached"]);
        expect(query && isRefreshingCachedQuery(query)).toBe(true);

        resolveFetch(["fresh"]);
        await fetch;

        expect(queryClient.getQueryData(queryKey)).toEqual(["fresh"]);
        expect(query && isRefreshingCachedQuery(query)).toBe(false);
    });

    test("keeps cached data when a background refresh fails", async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const queryKey = prRunQueryKeys.diff("project-1", "feature", "main");
        const cachedData = { files: ["cached"] };

        queryClient.setQueryData(queryKey, cachedData);
        await expect(
            queryClient.fetchQuery({
                queryFn: () => Promise.reject(new Error("offline")),
                queryKey,
                staleTime: 0,
            }),
        ).rejects.toThrow("offline");

        expect(queryClient.getQueryData(queryKey)).toEqual(cachedData);
    });

    test("does not mark uncached or excluded queries as cached refreshes", async () => {
        const queryClient = new QueryClient();
        const uncachedKey = prRunQueryKeys.activity(
            "project-1",
            "feature",
            "main",
        );
        const dockerKey = prRunQueryKeys.docker("project-1", "feature");
        const neverResolves = new Promise(() => undefined);

        queryClient.fetchQuery({
            queryFn: () => neverResolves,
            queryKey: uncachedKey,
        });
        queryClient.setQueryData(dockerKey, { state: "running" });
        queryClient.fetchQuery({
            queryFn: () => neverResolves,
            queryKey: dockerKey,
            staleTime: 0,
        });

        const uncachedQuery = queryClient.getQueryCache().find({
            queryKey: uncachedKey,
        });
        const dockerQuery = queryClient.getQueryCache().find({
            queryKey: dockerKey,
        });

        expect(uncachedQuery && isRefreshingCachedQuery(uncachedQuery)).toBe(
            false,
        );
        expect(dockerQuery && isRefreshingCachedQuery(dockerQuery)).toBe(false);
    });
});

function createPersistedClient(
    overrides: Partial<PersistedClient> = {},
): PersistedClient {
    return {
        buster: QUERY_CACHE_BUSTER,
        clientState: dehydrate(new QueryClient()),
        timestamp: Date.now(),
        ...overrides,
    };
}
