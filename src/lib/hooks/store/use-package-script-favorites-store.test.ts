import { describe, expect, test } from "vitest";

import {
    getPackageScriptKey,
    getProjectFavoriteKeys,
    togglePackageScriptFavorite,
} from "@/lib/hooks/store/use-package-script-favorites-store";

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
});
