import { BusyIcon } from "@/lib/components/atoms/busy-icon";
import { cn } from "@/lib/utils/cn";

type BranchPageTab = "general" | "run" | "diff" | "docker" | "env";

type BranchPageTabsProps = {
    activeTab: BranchPageTab;
    isRunTabBusy: boolean;
    onSelectTab: (tab: BranchPageTab) => void;
};

const tabs: { label: string; value: BranchPageTab }[] = [
    { label: "Overview", value: "general" },
    { label: "Run", value: "run" },
    { label: "Diff", value: "diff" },
    { label: "Docker", value: "docker" },
    { label: "Env", value: "env" },
];

export function BranchPageTabs({
    activeTab,
    isRunTabBusy,
    onSelectTab,
}: BranchPageTabsProps) {
    return (
        <div
            className="bg-muted/35 inline-flex rounded-lg border p-0.5"
            role="tablist"
        >
            {tabs.map((tab) => (
                <button
                    aria-selected={activeTab === tab.value}
                    className={cn(
                        `text-muted-foreground flex h-7 items-center
                        justify-center gap-1 rounded-md px-2.5 text-xs
                        font-medium transition-colors`,
                        activeTab === tab.value &&
                            "bg-card text-foreground shadow-sm/5",
                    )}
                    key={tab.value}
                    role="tab"
                    type="button"
                    onClick={() => onSelectTab(tab.value)}
                >
                    {tab.value === "run" && isRunTabBusy ? (
                        <BusyIcon size="sm" />
                    ) : null}
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export type { BranchPageTab };
