import { useEffect, useRef } from "react";

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
    const activeTabRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        activeTabRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest",
        });
    }, [activeTabId]);

    return (
        <ScrollArea className="h-full min-w-0 flex-1" hideScrollbars scrollFade>
            <nav
                aria-label="Open worktrees"
                className="flex h-full w-max min-w-full items-center gap-1 px-2
                    py-1"
                role="tablist"
            >
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        ref={tab.id === activeTabId ? activeTabRef : undefined}
                    >
                        <WorktreeTab
                            isActive={tab.id === activeTabId}
                            tab={tab}
                            projectAvatarUri={projectAvatarUris.get(
                                tab.projectId,
                            )}
                            onClose={() => onCloseTab(tab.id)}
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
