import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    getPackageScriptKey,
    getProjectFavoriteKeys,
    togglePackageScriptFavorite,
    usePackageScriptFavoritesStore,
} from "@/lib/hooks/store/use-package-script-favorites-store";

const localStorage = {
    getItem: vi.fn<() => string | null>(() => null),
    setItem: vi.fn(),
};
const originalLocalStorage = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
);

beforeEach(() => {
    localStorage.getItem.mockReset();
    localStorage.setItem.mockReset();
    Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: localStorage,
    });
    usePackageScriptFavoritesStore.setState({ favoriteKeysByProject: {} });
});

afterEach(() => {
    if (originalLocalStorage) {
        Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
    } else {
        Reflect.deleteProperty(globalThis, "localStorage");
    }
});

describe("package script favorites", () => {
    test("keeps the empty project selection referentially stable", () => {
        const favorites = {};

        expect(getProjectFavoriteKeys(favorites, "project-a")).toBe(
            getProjectFavoriteKeys(favorites, "project-a"),
        );
    });

    test("uses the package path to distinguish workspace scripts", () => {
        expect(getPackageScriptKey({ name: "dev", packagePath: "." })).not.toBe(
            getPackageScriptKey({ name: "dev", packagePath: "apps/web" }),
        );
    });

    test("adds and removes a favorite without disturbing the order", () => {
        expect(togglePackageScriptFavorite(["first"], "second")).toEqual([
            "first",
            "second",
        ]);
        expect(
            togglePackageScriptFavorite(["first", "second"], "first"),
        ).toEqual(["second"]);
    });

    test("removes duplicate occurrences of an existing favorite", () => {
        expect(
            togglePackageScriptFavorite(["one", "one", "two"], "one"),
        ).toEqual(["two"]);
    });

    test("keeps project favorite collections independent and persists changes", async () => {
        const first = {
            command: "bun run dev",
            name: "dev",
            packageName: "app",
            packagePath: ".",
            quick: true,
        };
        const second = { ...first, name: "test", quick: false };

        usePackageScriptFavoritesStore.getState().toggleFavorite("one", first);
        usePackageScriptFavoritesStore.getState().toggleFavorite("two", second);
        await Promise.resolve();

        expect(
            usePackageScriptFavoritesStore.getState().favoriteKeysByProject,
        ).toEqual({
            one: [getPackageScriptKey(first)],
            two: [getPackageScriptKey(second)],
        });
        expect(localStorage.setItem).toHaveBeenLastCalledWith(
            "pr-run:package-script-favorites",
            JSON.stringify({
                one: [getPackageScriptKey(first)],
                two: [getPackageScriptKey(second)],
            }),
        );

        usePackageScriptFavoritesStore.getState().toggleFavorite("one", first);
        await Promise.resolve();
        expect(
            getProjectFavoriteKeys(
                usePackageScriptFavoritesStore.getState().favoriteKeysByProject,
                "one",
            ),
        ).toEqual([]);
    });

    test("updates state even when storage rejects the persistence write", async () => {
        localStorage.setItem.mockImplementation(() => {
            throw new Error("storage unavailable");
        });
        const script = {
            command: "bun run dev",
            name: "dev",
            packageName: "app",
            packagePath: ".",
            quick: true,
        };

        usePackageScriptFavoritesStore
            .getState()
            .toggleFavorite("project", script);
        await Promise.resolve();

        expect(
            usePackageScriptFavoritesStore.getState().favoriteKeysByProject,
        ).toEqual({ project: [getPackageScriptKey(script)] });
    });
});
