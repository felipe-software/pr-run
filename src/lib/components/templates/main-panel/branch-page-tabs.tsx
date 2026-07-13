import { BusyIcon } from "@/lib/components/atoms/busy-icon";
import { getRovingFocusIndex } from "@/lib/components/roving-focus";
import type { BranchPageTab } from "@/lib/components/templates/pr-run-app/types";
import { cn } from "@/lib/utils/cn";
import {
    Container,
    FileKey2,
    Files,
    MessageSquareText,
    Play,
    type LucideIcon,
} from "lucide-react";
import { useRef } from "react";

type BranchPageTabsProps = {
    activeTab: BranchPageTab;
    isRunTabBusy: boolean;
    onSelectTab: (tab: BranchPageTab) => void;
};

const tabs: { icon: LucideIcon; label: string; value: BranchPageTab }[] = [
    { icon: MessageSquareText, label: "Activity", value: "activity" },
    { icon: Play, label: "Run", value: "run" },
    { icon: Files, label: "Changes", value: "changes" },
    { icon: Container, label: "Docker", value: "docker" },
    { icon: FileKey2, label: "Environment", value: "env" },
];

export function BranchPageTabs({
    activeTab,
    isRunTabBusy,
    onSelectTab,
}: BranchPageTabsProps) {
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    function moveFocus(currentIndex: number, key: string) {
        const nextIndex = getRovingFocusIndex(currentIndex, tabs.length, key);

        if (nextIndex === null) {
            return false;
        }

        const nextTab = tabs[nextIndex];

        if (!nextTab) {
            return false;
        }

        onSelectTab(nextTab.value);
        tabRefs.current[nextIndex]?.focus();
        return true;
    }

    return (
        <nav
            aria-label="Worktree sections"
            className="border-border/70 flex min-w-0 gap-0.5 overflow-x-auto
                border-b px-1"
        >
            {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.value;

                return (
                    <button
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                            `text-muted-foreground focus-visible:ring-ring
                            relative flex h-9 items-center justify-center
                            gap-1.5 rounded-md px-3 text-xs font-medium
                            transition-colors outline-none focus-visible:ring-2`,
                            isActive &&
                                `text-foreground after:bg-primary after:absolute
                                after:right-2 after:bottom-0 after:left-2
                                after:h-0.5 after:rounded-full`,
                        )}
                        key={tab.value}
                        ref={(node) => {
                            tabRefs.current[index] = node;
                        }}
                        tabIndex={isActive ? 0 : -1}
                        type="button"
                        onClick={() => onSelectTab(tab.value)}
                        onKeyDown={(event) => {
                            if (moveFocus(index, event.key)) {
                                event.preventDefault();
                            }
                        }}
                    >
                        {tab.value === "run" && isRunTabBusy ? (
                            <BusyIcon size="sm" />
                        ) : (
                            <Icon className="size-3.5" />
                        )}
                        {tab.label}
                    </button>
                );
            })}
        </nav>
    );
}

export type { BranchPageTab } from "@/lib/components/templates/pr-run-app/types";
