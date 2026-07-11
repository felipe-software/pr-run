import { PanelLeft } from "lucide-react";
import { useEffect } from "react";

import { WindowControlsInset } from "@/lib/components/templates/workspace-titlebar/window-controls";
import { WorktreeTabs } from "@/lib/components/templates/workspace-titlebar/worktree-tabs";
import { Button } from "@/lib/components/ui/button";
import {
    cycleWorkspaceTabs,
    useWorkspaceTabsStore,
} from "@/lib/hooks/store/use-workspace-tabs-store";
import {
    Tooltip,
    TooltipPopup,
    TooltipTrigger,
} from "@/lib/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";
import type { ProjectAvatarUris } from "@/lib/project-avatar";

type WorkspaceTitlebarProps = {
    areWorkspaceShortcutsEnabled: boolean;
    isSidebarOpen: boolean;
    projectAvatarUris: ProjectAvatarUris;
    onCloseTab: (tabId: string) => void;
    onSelectTab: (tabId: string) => void;
    onToggleSidebar: () => void;
};

export function WorkspaceTitlebar({
    areWorkspaceShortcutsEnabled,
    isSidebarOpen,
    projectAvatarUris,
    onCloseTab,
    onSelectTab,
    onToggleSidebar,
}: WorkspaceTitlebarProps) {
    const activeTabId = useWorkspaceTabsStore((store) => store.activeTabId);
    const isMac = window.prRun?.platform === "darwin";

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (
                event.defaultPrevented ||
                (!event.metaKey && !event.ctrlKey) ||
                isTypingTarget(event.target)
            ) {
                return;
            }

            if (event.key === "Tab") {
                event.preventDefault();

                if (!areWorkspaceShortcutsEnabled) {
                    return;
                }

                const nextTabId = cycleWorkspaceTabs(
                    useWorkspaceTabsStore.getState(),
                    event.shiftKey ? "previous" : "next",
                );

                if (!nextTabId) {
                    return;
                }

                onSelectTab(nextTabId);
                return;
            }

            if (event.key.toLowerCase() === "w") {
                event.preventDefault();

                if (areWorkspaceShortcutsEnabled && activeTabId) {
                    onCloseTab(activeTabId);
                }
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTabId, areWorkspaceShortcutsEnabled, onCloseTab, onSelectTab]);

    return (
        <header
            className="workspace-titlebar drag-region border-sidebar-border
                relative border-b"
        >
            <div
                className={cn(
                    `workspace-titlebar-brand drag-region border-sidebar-border
                    flex h-full shrink-0 items-center overflow-hidden border-r
                    transition-[width,border-color] duration-200 ease-out`,
                    isSidebarOpen
                        ? "border-sidebar-border"
                        : "border-transparent",
                )}
                data-slot="sidebar-titlebar-gap"
                style={{
                    width: isSidebarOpen ? "var(--sidebar-width)" : "0px",
                }}
            >
                {isSidebarOpen ? (
                    <span
                        className={cn(
                            `min-w-0 flex-1 truncate pr-3 text-xs font-semibold
                                tracking-tight`,
                            isMac ? "pl-28" : "pl-11",
                        )}
                    >
                        PR Run
                    </span>
                ) : null}
            </div>
            <div
                className={cn(
                    `flex min-w-0 flex-1 items-center transition-[padding]
                    duration-200 ease-out`,
                    !isSidebarOpen && (isMac ? "pl-28" : "pl-10"),
                )}
            >
                <WorktreeTabs
                    projectAvatarUris={projectAvatarUris}
                    onCloseTab={onCloseTab}
                    onSelectTab={onSelectTab}
                />
                <WindowControlsInset />
            </div>
            <div
                className={cn(
                    `no-drag absolute top-0 z-20 flex h-full items-center
                    transition-transform duration-200 ease-out`,
                    isMac ? "left-20" : "left-[var(--workspace-controls-left)]",
                )}
            >
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                aria-label={
                                    isSidebarOpen
                                        ? "Hide sidebar"
                                        : "Show sidebar"
                                }
                                className="text-muted-foreground
                                    hover:text-foreground active:scale-95"
                                size="icon-xs"
                                variant="ghost"
                                onClick={onToggleSidebar}
                            />
                        }
                    >
                        <PanelLeft className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipPopup>
                        {isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                    </TooltipPopup>
                </Tooltip>
            </div>
        </header>
    );
}

function isTypingTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target.isContentEditable ||
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.tagName === "TEXTAREA"
    );
}
