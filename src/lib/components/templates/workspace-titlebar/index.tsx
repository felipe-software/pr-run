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

type WorkspaceTitlebarProps = {
    isSidebarOpen: boolean;
    sidebarWidth: number;
    onCloseTab: (tabId: string) => void;
    onSelectTab: (tabId: string) => void;
    onToggleSidebar: () => void;
};

export function WorkspaceTitlebar({
    isSidebarOpen,
    sidebarWidth,
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
                const nextTabId = cycleWorkspaceTabs(
                    useWorkspaceTabsStore.getState(),
                    event.shiftKey ? "previous" : "next",
                );

                if (!nextTabId) {
                    return;
                }

                event.preventDefault();
                onSelectTab(nextTabId);
                return;
            }

            if (event.key.toLowerCase() === "w" && activeTabId) {
                event.preventDefault();
                onCloseTab(activeTabId);
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeTabId, onCloseTab, onSelectTab]);

    return (
        <header
            className="workspace-titlebar drag-region border-sidebar-border
                border-b"
        >
            <div
                className={cn(
                    `workspace-titlebar-brand drag-region border-sidebar-border
                    flex h-full shrink-0 items-center gap-2 border-r px-3`,
                    isMac && "workspace-titlebar-brand-macos pl-20",
                )}
                style={{ width: `${isSidebarOpen ? sidebarWidth : 48}px` }}
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
                                    hover:text-foreground"
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
                {isSidebarOpen ? (
                    <span
                        className="min-w-0 flex-1 truncate text-xs font-semibold
                            tracking-tight"
                    >
                        PR Run
                    </span>
                ) : null}
            </div>
            <div className="flex min-w-0 flex-1 items-center">
                <WorktreeTabs
                    onCloseTab={onCloseTab}
                    onSelectTab={onSelectTab}
                />
                <WindowControlsInset />
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
