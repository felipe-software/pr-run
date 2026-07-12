import { create } from "zustand";
import type { Hotkey } from "@tanstack/react-hotkeys";

import { tryPromise } from "@/lib/error";
import { parseStoredNumber } from "@/lib/utils/parse-stored-number";

export type ThemePreference = "system" | "dark" | "light";
export type DateFormatPreference =
    | "dd/mm/yyyy"
    | "mm/dd/yyyy"
    | "mm-dd-yyyy"
    | "yyyy-mm-dd";
export type HotkeyAction =
    | "closeSidebar"
    | "closeTab"
    | "globalTerminal"
    | "nextTab"
    | "previousTab";

export const defaultHotkeys: Record<HotkeyAction, Hotkey> = {
    closeSidebar: "Mod+B",
    closeTab: "Control+W",
    globalTerminal: "Control+Escape",
    nextTab: "Control+Tab",
    previousTab: "Control+Shift+Tab",
};

type UiPreferencesState = {
    dateFormat: DateFormatPreference;
    hotkeys: Record<HotkeyAction, Hotkey>;
    resetHotkeys: () => void;
    sidebarWidth: number | null;
    setSidebarWidth: (width: number) => void;
    setDateFormat: (dateFormat: DateFormatPreference) => void;
    setHotkey: (action: HotkeyAction, hotkey: Hotkey) => void;
    setTerminalListWidth: (width: number) => void;
    setTerminalPanelHeight: (height: number) => void;
    setTheme: (theme: ThemePreference) => void;
    terminalListWidth: number | null;
    terminalPanelHeight: number | null;
    theme: ThemePreference;
};

const storageKeys = {
    sidebarWidth: "pr-run:sidebar-width",
    dateFormat: "pr-run:date-format",
    hotkeys: "pr-run:hotkeys",
    terminalListWidth: "pr-run:terminal-list-width",
    terminalPanelHeight: "pr-run:terminal-panel-height",
    theme: "pr-run:theme",
} as const;

function readDateFormat(): DateFormatPreference {
    const value = localStorage.getItem(storageKeys.dateFormat);

    return value === "dd/mm/yyyy" ||
        value === "mm/dd/yyyy" ||
        value === "mm-dd-yyyy" ||
        value === "yyyy-mm-dd"
        ? value
        : "dd/mm/yyyy";
}

function readHotkeys(): Record<HotkeyAction, Hotkey> {
    return defaultHotkeys;
}

function readNumber(key: string, legacyKey?: string) {
    const value =
        localStorage.getItem(key) ??
        (legacyKey ? localStorage.getItem(legacyKey) : null);
    return parseStoredNumber(value);
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
    dateFormat: readDateFormat(),
    hotkeys: readHotkeys(),
    resetHotkeys: () => {
        localStorage.setItem(
            storageKeys.hotkeys,
            JSON.stringify(defaultHotkeys),
        );
        set({ hotkeys: defaultHotkeys });
    },
    sidebarWidth: readNumber(storageKeys.sidebarWidth, "pr-run.sidebar.width"),
    setSidebarWidth: (sidebarWidth) => {
        writeNumber(storageKeys.sidebarWidth, sidebarWidth);
        set({ sidebarWidth });
    },
    setDateFormat: (dateFormat) => {
        localStorage.setItem(storageKeys.dateFormat, dateFormat);
        set({ dateFormat });
    },
    setHotkey: (action, hotkey) =>
        set((state) => {
            const hotkeys = { ...state.hotkeys, [action]: hotkey };
            localStorage.setItem(storageKeys.hotkeys, JSON.stringify(hotkeys));
            return { hotkeys };
        }),
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

async function hydrateHotkeys() {
    const value = localStorage.getItem(storageKeys.hotkeys);

    if (!value) {
        return;
    }

    const [error, parsed] = await tryPromise(
        Promise.resolve().then(
            () => JSON.parse(value) as Partial<Record<HotkeyAction, Hotkey>>,
        ),
    );

    if (!error) {
        useUiPreferencesStore.setState({
            hotkeys: { ...defaultHotkeys, ...parsed },
        });
    }
}

hydrateHotkeys();
