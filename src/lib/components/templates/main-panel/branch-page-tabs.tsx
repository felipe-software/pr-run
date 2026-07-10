import { BusyIcon } from "@/lib/components/atoms/busy-icon";
import { cn } from "@/lib/utils/cn";
import {
    Container,
    FileKey2,
    Files,
    MessageSquareText,
    Play,
    type LucideIcon,
} from "lucide-react";

type BranchPageTab = "activity" | "run" | "changes" | "docker" | "env";

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
    return (
        <nav
            aria-label="Worktree sections"
            className="border-border/70 flex min-w-0 gap-0.5 overflow-x-auto
                border-b px-1"
            role="tablist"
        >
            {tabs.map((tab) => {
                const Icon = tab.icon;

                return (
                    <button
                        aria-selected={activeTab === tab.value}
                        className={cn(
                            `text-muted-foreground focus-visible:ring-ring
                            relative flex h-9 items-center justify-center
                            gap-1.5 rounded-md px-3 text-xs font-medium
                            transition-colors outline-none focus-visible:ring-2`,
                            activeTab === tab.value &&
                                `text-foreground after:bg-primary after:absolute
                                after:right-2 after:bottom-0 after:left-2
                                after:h-0.5 after:rounded-full`,
                        )}
                        key={tab.value}
                        role="tab"
                        type="button"
                        onClick={() => onSelectTab(tab.value)}
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

export type { BranchPageTab };
