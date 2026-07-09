import { create } from "zustand";

export type ThemePreference = "system" | "dark" | "light";

type UiPreferencesState = {
    sidebarWidth: number | null;
    setSidebarWidth: (width: number) => void;
    setTerminalListWidth: (width: number) => void;
    setTerminalPanelHeight: (height: number) => void;
    setTheme: (theme: ThemePreference) => void;
    terminalListWidth: number | null;
    terminalPanelHeight: number | null;
    theme: ThemePreference;
};

const storageKeys = {
    sidebarWidth: "pr-run:sidebar-width",
    terminalListWidth: "pr-run:terminal-list-width",
    terminalPanelHeight: "pr-run:terminal-panel-height",
    theme: "pr-run:theme",
} as const;

function readNumber(key: string, legacyKey?: string) {
    const value =
        localStorage.getItem(key) ??
        (legacyKey ? localStorage.getItem(legacyKey) : null);
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
}

function readTheme(): ThemePreference {
    const current = localStorage.getItem(storageKeys.theme);
    const legacy = localStorage.getItem("pr-run-theme");
    const value = current ?? legacy;

    return value === "dark" || value === "light" || value === "system"
        ? value
        : "system";
}

function writeNumber(key: string, value: number) {
    localStorage.setItem(key, String(value));
}

export const useUiPreferencesStore = create<UiPreferencesState>((set) => ({
    sidebarWidth: readNumber(storageKeys.sidebarWidth, "pr-run.sidebar.width"),
    setSidebarWidth: (sidebarWidth) => {
        writeNumber(storageKeys.sidebarWidth, sidebarWidth);
        set({ sidebarWidth });
    },
    setTerminalListWidth: (terminalListWidth) => {
        writeNumber(storageKeys.terminalListWidth, terminalListWidth);
        set({ terminalListWidth });
    },
    setTerminalPanelHeight: (terminalPanelHeight) => {
        writeNumber(storageKeys.terminalPanelHeight, terminalPanelHeight);
        set({ terminalPanelHeight });
    },
    setTheme: (theme) => {
        localStorage.setItem(storageKeys.theme, theme);
        set({ theme });
    },
    terminalListWidth: readNumber(storageKeys.terminalListWidth),
    terminalPanelHeight: readNumber(storageKeys.terminalPanelHeight),
    theme: readTheme(),
}));
