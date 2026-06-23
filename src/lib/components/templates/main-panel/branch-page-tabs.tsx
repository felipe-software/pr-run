import { BusyIcon } from "@/lib/components/atoms/busy-icon";
import { TabShell } from "@/lib/components/atoms/tab-shell";

type BranchPageTab = "general" | "run" | "diff" | "docker" | "env";

type BranchPageTabsProps = {
    activeTab: BranchPageTab;
    isRunTabBusy: boolean;
    onSelectTab: (tab: BranchPageTab) => void;
};

const tabs: { label: string; value: BranchPageTab }[] = [
    { label: "General", value: "general" },
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
            className="relative z-10 mb-[-1px] flex w-fit items-end pr-1 pl-1"
            role="tablist"
        >
            {tabs.map((tab) => (
                <TabShell
                    className="min-w-[84px]"
                    isActive={activeTab === tab.value}
                    key={tab.value}
                >
                    <button
                        aria-selected={activeTab === tab.value}
                        className="flex h-full w-full items-center
                            justify-center gap-1.5 px-3 font-[inherit] text-xs
                            leading-none"
                        role="tab"
                        type="button"
                        onClick={() => onSelectTab(tab.value)}
                    >
                        {tab.value === "run" && isRunTabBusy ? (
                            <BusyIcon size="sm" />
                        ) : null}
                        {tab.label}
                    </button>
                </TabShell>
            ))}
        </div>
    );
}

export type { BranchPageTab };
