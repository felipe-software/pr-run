import { useEffect, useRef } from "react";

import { WorktreeTab } from "@/lib/components/templates/workspace-titlebar/worktree-tab";
import { useWorkspaceTabsStore } from "@/lib/hooks/store/use-workspace-tabs-store";

type WorktreeTabsProps = {
    onCloseTab: (tabId: string) => void;
    onSelectTab: (tabId: string) => void;
};

export function WorktreeTabs({ onCloseTab, onSelectTab }: WorktreeTabsProps) {
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
        <nav
            aria-label="Open worktrees"
            className="flex min-w-0 flex-1 [scrollbar-width:none] items-center
                overflow-x-auto px-2 py-1 [&::-webkit-scrollbar]:hidden"
            role="tablist"
        >
            <div className="flex min-w-max items-center gap-1">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        ref={tab.id === activeTabId ? activeTabRef : undefined}
                    >
                        <WorktreeTab
                            isActive={tab.id === activeTabId}
                            tab={tab}
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
            </div>
        </nav>
    );
}
