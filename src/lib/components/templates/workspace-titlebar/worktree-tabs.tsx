import { useEffect, useRef } from "react";

import { getRovingFocusIndex } from "@/lib/components/roving-focus";
import { WorktreeTab } from "@/lib/components/templates/workspace-titlebar/worktree-tab";
import { ScrollArea } from "@/lib/components/ui/scroll-area";
import { useWorkspaceTabsStore } from "@/lib/hooks/store/use-workspace-tabs-store";
import type { ProjectAvatarUris } from "@/lib/project-avatar";

type WorktreeTabsProps = {
    onCloseTab: (tabId: string) => void;
    onSelectTab: (tabId: string) => void;
    projectAvatarUris: ProjectAvatarUris;
};

export function WorktreeTabs({
    onCloseTab,
    onSelectTab,
    projectAvatarUris,
}: WorktreeTabsProps) {
    const activeTabId = useWorkspaceTabsStore((store) => store.activeTabId);
    const tabs = useWorkspaceTabsStore((store) => store.tabs);
    const reorderTab = useWorkspaceTabsStore((store) => store.reorderTab);
    const activeTabRef = useRef<HTMLDivElement | null>(null);
    const draggedTabIdRef = useRef<string | null>(null);
    const tabButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useEffect(() => {
        activeTabRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
        });
    }, [activeTabId]);

    function moveFocus(currentIndex: number, key: string) {
        const nextIndex = getRovingFocusIndex(currentIndex, tabs.length, key);

        if (nextIndex === null) {
            return false;
        }

        const nextTab = tabs[nextIndex];

        if (!nextTab) {
            return false;
        }

        onSelectTab(nextTab.id);
        tabButtonRefs.current[nextIndex]?.focus();
        return true;
    }

    return (
        <ScrollArea className="h-full min-w-0 flex-1" hideScrollbars scrollFade>
            <nav
                aria-label="Open worktrees"
                className="flex h-full w-max min-w-full items-center gap-1 px-2
                    py-1"
            >
                {tabs.map((tab, index) => (
                    <div
                        className="cursor-grab active:cursor-grabbing"
                        draggable
                        key={tab.id}
                        ref={tab.id === activeTabId ? activeTabRef : undefined}
                        onDragEnd={() => {
                            draggedTabIdRef.current = null;
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDragStart={(event) => {
                            draggedTabIdRef.current = tab.id;
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", tab.id);
                        }}
                        onDrop={(event) => {
                            event.preventDefault();
                            const sourceId =
                                draggedTabIdRef.current ||
                                event.dataTransfer.getData("text/plain");

                            if (sourceId) {
                                reorderTab(sourceId, tab.id);
                            }

                            draggedTabIdRef.current = null;
                        }}
                    >
                        <WorktreeTab
                            isActive={tab.id === activeTabId}
                            tab={tab}
                            tabButtonRef={(node) => {
                                tabButtonRefs.current[index] = node;
                            }}
                            tabIndex={tab.id === activeTabId ? 0 : -1}
                            projectAvatarUri={projectAvatarUris.get(
                                tab.projectId,
                            )}
                            onClose={() => onCloseTab(tab.id)}
                            onKeyDown={(event) => {
                                if (moveFocus(index, event.key)) {
                                    event.preventDefault();
                                }
                            }}
                            onSelect={() => onSelectTab(tab.id)}
                        />
                    </div>
                ))}
                {tabs.length === 0 ? (
                    <span className="text-muted-foreground/55 px-2 text-[11px]">
                        Open a worktree to add it here
                    </span>
                ) : null}
            </nav>
        </ScrollArea>
    );
}
