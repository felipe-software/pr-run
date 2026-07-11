import { describe, expect, test } from "bun:test";

import {
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

    test("keeps macOS traffic lights in the inset title bar", () => {
        expect(getWindowChromeOptions("darwin", "light")).toMatchObject({
            titleBarStyle: "hiddenInset",
            trafficLightPosition: { x: 14, y: 13 },
        });
    });
});
