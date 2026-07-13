import { describe, expect, test } from "vitest";

import {
    getWindowChromeBackground,
    getWindowChromeOptions,
    WORKSPACE_TITLEBAR_HEIGHT,
} from "./window-chrome";

describe("getWindowChromeOptions", () => {
    test("uses the renderer-owned overlay outside macOS", () => {
        expect(getWindowChromeOptions("win32", "dark")).toMatchObject({
            titleBarOverlay: {
                color: "#01000000",
                height: WORKSPACE_TITLEBAR_HEIGHT,
            },
            titleBarStyle: "hidden",
        });
    });

    test.each([
        ["dark", "#e8eaed"],
        ["light", "#25272a"],
    ] as const)("uses the %s theme symbol color", (theme, symbolColor) => {
        expect(getWindowChromeOptions("linux", theme)).toEqual({
            titleBarOverlay: {
                color: "#01000000",
                height: WORKSPACE_TITLEBAR_HEIGHT,
                symbolColor,
            },
            titleBarStyle: "hidden",
        });
    });

    test("keeps macOS traffic lights in the inset title bar", () => {
        expect(getWindowChromeOptions("darwin", "light")).toMatchObject({
            titleBarStyle: "hiddenInset",
            trafficLightPosition: { x: 14, y: 13 },
        });
    });

    test("uses the same renderer chrome on Linux and Windows", () => {
        expect(getWindowChromeOptions("linux", "dark")).toEqual(
            getWindowChromeOptions("win32", "dark"),
        );
    });
});

describe("getWindowChromeBackground", () => {
    test("returns the background for each theme", () => {
        expect(getWindowChromeBackground("dark")).toBe("#17191c");
        expect(getWindowChromeBackground("light")).toBe("#f5f6f7");
    });
});
