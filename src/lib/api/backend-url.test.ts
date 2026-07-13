import { describe, expect, test } from "vitest";

import {
    requireLoopbackBackendUrl,
    resolveBrowserBackendUrl,
} from "@/lib/api/backend-url";

function createStorage(initialValue?: string) {
    const values = new Map<string, string>();

    if (initialValue) {
        values.set("pr-run.backend.url", initialValue);
    }

    return {
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
        values,
    };
}

describe("browser backend URL resolution", () => {
    test("accepts and persists a loopback query override", () => {
        const storage = createStorage();
        const backendUrl = resolveBrowserBackendUrl({
            search: "?api=http%3A%2F%2F%5B%3A%3A1%5D%3A4567",
            storage,
        });

        expect(backendUrl).toBe("http://[::1]:4567");
        expect(storage.values.get("pr-run.backend.url")).toBe(backendUrl);
    });

    test("ignores a remote query override without persisting it", () => {
        const storage = createStorage();
        const backendUrl = resolveBrowserBackendUrl({
            search: "?api=https%3A%2F%2Fexample.com",
            storage,
        });

        expect(backendUrl).toBe("http://127.0.0.1:33134");
        expect(storage.values.size).toBe(0);
    });

    test("removes an invalid stored override", () => {
        const storage = createStorage("http://example.com:33134");
        const backendUrl = resolveBrowserBackendUrl({
            search: "",
            storage,
        });

        expect(backendUrl).toBe("http://127.0.0.1:33134");
        expect(storage.values.size).toBe(0);
    });

    test("uses only a loopback configured URL", () => {
        const storage = createStorage("http://localhost:4455");

        expect(
            resolveBrowserBackendUrl({
                configuredUrl: "https://example.com",
                search: "",
                storage,
            }),
        ).toBe("http://localhost:4455");
    });

    test("rejects a remote Electron backend URL", () => {
        expect(() => requireLoopbackBackendUrl("https://example.com")).toThrow(
            "loopback HTTP origin",
        );
    });
});
