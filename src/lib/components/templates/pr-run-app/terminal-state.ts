import { getTerminalKey } from "@/lib/components/templates/global-terminal-panel";
import type { useWorktreeTerminalStore } from "@/lib/hooks/store/use-worktree-terminal-store";

type TerminalOwners = ReturnType<
    typeof useWorktreeTerminalStore.getState
>["owners"];

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

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}
