import type { BrowserWindowConstructorOptions } from "electron";

export const WORKSPACE_TITLEBAR_HEIGHT = 36;
const TRANSPARENT_TITLEBAR_COLOR = "#01000000";

export type WindowTheme = "dark" | "light";

const windowColors = {
    dark: {
        background: "#17191c",
        symbol: "#e8eaed",
    },
    light: {
        background: "#f5f6f7",
        symbol: "#25272a",
    },
} as const;

export function getWindowChromeOptions(
    platform: NodeJS.Platform,
    theme: WindowTheme,
): Pick<
    BrowserWindowConstructorOptions,
    "titleBarOverlay" | "titleBarStyle" | "trafficLightPosition"
> {
    if (platform === "darwin") {
        return {
            titleBarStyle: "hiddenInset",
            trafficLightPosition: { x: 14, y: 13 },
        };
    }

    return {
        titleBarOverlay: {
            color: TRANSPARENT_TITLEBAR_COLOR,
            height: WORKSPACE_TITLEBAR_HEIGHT,
            symbolColor: windowColors[theme].symbol,
        },
        titleBarStyle: "hidden",
    };
}

export function getWindowChromeBackground(theme: WindowTheme) {
    return windowColors[theme].background;
}
