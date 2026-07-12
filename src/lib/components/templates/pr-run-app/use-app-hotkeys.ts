import { useHotkeys } from "@tanstack/react-hotkeys";

import { useUiPreferencesStore } from "@/lib/hooks/store/use-ui-preferences-store";

type UseAppHotkeysOptions = {
    isBranchWorkspaceVisible: boolean;
    onCloseActiveTab: () => void;
    onOpenGlobalTerminal: () => void;
    onSelectNextTab: () => void;
    onSelectPreviousTab: () => void;
    onToggleSidebar: () => void;
};

export function useAppHotkeys({
    isBranchWorkspaceVisible,
    onCloseActiveTab,
    onOpenGlobalTerminal,
    onSelectNextTab,
    onSelectPreviousTab,
    onToggleSidebar,
}: UseAppHotkeysOptions) {
    const hotkeys = useUiPreferencesStore((store) => store.hotkeys);

    useHotkeys([
        {
            callback: onToggleSidebar,
            hotkey: hotkeys.closeSidebar,
            options: { meta: { name: "Toggle sidebar" } },
        },
        {
            callback: onSelectNextTab,
            hotkey: hotkeys.nextTab,
            options: {
                enabled: isBranchWorkspaceVisible,
                meta: { name: "Next tab" },
            },
        },
        {
            callback: onSelectPreviousTab,
            hotkey: hotkeys.previousTab,
            options: {
                enabled: isBranchWorkspaceVisible,
                meta: { name: "Previous tab" },
            },
        },
        {
            callback: onCloseActiveTab,
            hotkey: hotkeys.closeTab,
            options: {
                enabled: isBranchWorkspaceVisible,
                meta: { name: "Close tab" },
            },
        },
        {
            callback: onOpenGlobalTerminal,
            hotkey: hotkeys.globalTerminal,
            options: { meta: { name: "Open global terminal" } },
        },
    ]);
}
