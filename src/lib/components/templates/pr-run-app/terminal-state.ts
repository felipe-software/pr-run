import { getTerminalKey } from "@/lib/components/templates/global-terminal-panel/terminal-selection";
import type {
    WorktreeTerminalOwnerKey,
    WorktreeTerminalOwnerState,
} from "@/lib/hooks/store/use-worktree-terminal-store";

type TerminalOwners = Record<
    WorktreeTerminalOwnerKey,
    WorktreeTerminalOwnerState
>;

const TERMINAL_PANEL_DEFAULT_HEIGHT = 320;
const TERMINAL_PANEL_MIN_HEIGHT = 180;
const TERMINAL_PANEL_SIDEBAR_DEFAULT_WIDTH = 180;
const TERMINAL_PANEL_SIDEBAR_MIN_WIDTH = 132;
const TERMINAL_PANEL_SIDEBAR_MAX_WIDTH = 360;

export function getPreferredGlobalTerminalKey(owners: TerminalOwners) {
    const fallback = getFirstTerminalKey(owners);

    for (const [ownerKey, owner] of Object.entries(owners)) {
        const busyTab = owner.tabs.find(
            (tab) => tab.status === "alive" && tab.busyState === "busy",
        );

        if (busyTab) {
            return getTerminalKey(ownerKey, busyTab.id);
        }
    }

    return fallback;
}

function getFirstTerminalKey(owners: TerminalOwners) {
    for (const [ownerKey, owner] of Object.entries(owners)) {
        const firstTab = owner.tabs[0];

        if (firstTab) {
            return getTerminalKey(ownerKey, firstTab.id);
        }
    }

    return null;
}

export function getActiveOwnerTerminalKey(
    owners: TerminalOwners,
    ownerKey: string,
) {
    const owner = owners[ownerKey];

    if (!owner) {
        return null;
    }

    const activeTab =
        owner.tabs.find((tab) => tab.id === owner.activeTabId) ?? owner.tabs[0];

    return activeTab ? getTerminalKey(ownerKey, activeTab.id) : null;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export const terminalPanelSize = {
    initialHeight(storedHeight: number | null) {
        return Math.max(
            storedHeight ?? TERMINAL_PANEL_DEFAULT_HEIGHT,
            TERMINAL_PANEL_MIN_HEIGHT,
        );
    },
    initialSidebarWidth(storedWidth: number | null) {
        return clamp(
            storedWidth ?? TERMINAL_PANEL_SIDEBAR_DEFAULT_WIDTH,
            TERMINAL_PANEL_SIDEBAR_MIN_WIDTH,
            TERMINAL_PANEL_SIDEBAR_MAX_WIDTH,
        );
    },
    resizeHeight(startHeight: number, startY: number, currentY: number) {
        return Math.max(
            startHeight + startY - currentY,
            TERMINAL_PANEL_MIN_HEIGHT,
        );
    },
    resizeSidebarWidth(startWidth: number, startX: number, currentX: number) {
        return clamp(
            startWidth + startX - currentX,
            TERMINAL_PANEL_SIDEBAR_MIN_WIDTH,
            TERMINAL_PANEL_SIDEBAR_MAX_WIDTH,
        );
    },
};
