import { create } from "zustand";

const STORAGE_KEY = "pr-run:workspace-tabs";

export type WorktreeTab = {
    branchName: string;
    id: string;
    projectId: string;
    projectName: string;
};

type PersistedWorkspaceTabs = {
    activeTabId: string | null;
    tabs: WorktreeTab[];
};

type WorkspaceTabsStore = PersistedWorkspaceTabs & {
    activateTab: (tabId: string) => void;
    closeTab: (tabId: string) => void;
    cycleTabs: (direction: "next" | "previous") => void;
    openTab: (tab: Omit<WorktreeTab, "id">) => void;
    pruneTabs: (validTabIds: Set<string>) => void;
    reorderTab: (tabId: string, targetTabId: string) => void;
};

export function getWorktreeTabId(projectId: string, branchName: string) {
    return `${projectId}:${branchName}`;
}

export function closeWorkspaceTab(
    state: PersistedWorkspaceTabs,
    tabId: string,
): PersistedWorkspaceTabs {
    const index = state.tabs.findIndex((tab) => tab.id === tabId);

    if (index === -1) {
        return state;
    }

    const tabs = state.tabs.filter((tab) => tab.id !== tabId);
    const activeTabId =
        state.activeTabId !== tabId
            ? state.activeTabId
            : (tabs[index]?.id ?? tabs[index - 1]?.id ?? null);

    return { activeTabId, tabs };
}

export function cycleWorkspaceTabs(
    state: PersistedWorkspaceTabs,
    direction: "next" | "previous",
) {
    if (state.tabs.length === 0) {
        return null;
    }

    const currentIndex = state.tabs.findIndex(
        (tab) => tab.id === state.activeTabId,
    );
    const index = currentIndex === -1 ? 0 : currentIndex;
    const offset = direction === "next" ? 1 : -1;
    const nextIndex = (index + offset + state.tabs.length) % state.tabs.length;

    return state.tabs[nextIndex]?.id ?? null;
}

export function reorderWorkspaceTabs(
    tabs: WorktreeTab[],
    tabId: string,
    targetTabId: string,
) {
    const sourceIndex = tabs.findIndex((tab) => tab.id === tabId);
    const targetIndex = tabs.findIndex((tab) => tab.id === targetTabId);

    if (
        sourceIndex === -1 ||
        targetIndex === -1 ||
        sourceIndex === targetIndex
    ) {
        return tabs;
    }

    const next = [...tabs];
    const [tab] = next.splice(sourceIndex, 1);

    if (!tab) {
        return tabs;
    }

    next.splice(targetIndex, 0, tab);
    return next;
}

function readSession(): PersistedWorkspaceTabs {
    if (typeof window === "undefined") {
        return { activeTabId: null, tabs: [] };
    }

    try {
        const value = window.localStorage.getItem(STORAGE_KEY);

        if (!value) {
            return { activeTabId: null, tabs: [] };
        }

        const parsed = JSON.parse(value) as Partial<PersistedWorkspaceTabs>;
        const tabs = Array.isArray(parsed.tabs)
            ? parsed.tabs.filter(isWorktreeTab)
            : [];
        const activeTabId =
            typeof parsed.activeTabId === "string" &&
            tabs.some((tab) => tab.id === parsed.activeTabId)
                ? parsed.activeTabId
                : null;

        return { activeTabId, tabs };
    } catch {
        return { activeTabId: null, tabs: [] };
    }
}

function isWorktreeTab(value: unknown): value is WorktreeTab {
    return (
        typeof value === "object" &&
        value !== null &&
        "branchName" in value &&
        "id" in value &&
        "projectId" in value &&
        "projectName" in value &&
        typeof value.branchName === "string" &&
        typeof value.id === "string" &&
        typeof value.projectId === "string" &&
        typeof value.projectName === "string"
    );
}

function persistSession(state: PersistedWorkspaceTabs) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const initialSession = readSession();

export const useWorkspaceTabsStore = create<WorkspaceTabsStore>((set, get) => ({
    ...initialSession,
    activateTab(tabId) {
        if (!get().tabs.some((tab) => tab.id === tabId)) {
            return;
        }

        const next = { activeTabId: tabId, tabs: get().tabs };
        persistSession(next);
        set(next);
    },
    closeTab(tabId) {
        const next = closeWorkspaceTab(get(), tabId);
        persistSession(next);
        set(next);
    },
    cycleTabs(direction) {
        const activeTabId = cycleWorkspaceTabs(get(), direction);

        if (!activeTabId) {
            return;
        }

        const next = { activeTabId, tabs: get().tabs };
        persistSession(next);
        set(next);
    },
    openTab(tab) {
        const id = getWorktreeTabId(tab.projectId, tab.branchName);
        const existing = get().tabs.find((item) => item.id === id);
        const nextTab = { ...tab, id };
        const tabs = existing
            ? get().tabs.map((item) => (item.id === id ? nextTab : item))
            : [...get().tabs, nextTab];
        const next = { activeTabId: id, tabs };

        persistSession(next);
        set(next);
    },
    pruneTabs(validTabIds) {
        const tabs = get().tabs.filter((tab) => validTabIds.has(tab.id));
        const activeTabId = tabs.some((tab) => tab.id === get().activeTabId)
            ? get().activeTabId
            : (tabs[0]?.id ?? null);
        const next = { activeTabId, tabs };

        persistSession(next);
        set(next);
    },
    reorderTab(tabId, targetTabId) {
        const tabs = reorderWorkspaceTabs(get().tabs, tabId, targetTabId);

        if (tabs === get().tabs) {
            return;
        }

        const next = { activeTabId: get().activeTabId, tabs };
        persistSession(next);
        set(next);
    },
}));
