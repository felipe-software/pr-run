import { TabShell } from "@/lib/components/atoms/tab-shell";

type BranchPageTab = "general" | "run" | "diff";

type BranchPageTabsProps = {
    activeTab: BranchPageTab;
    onSelectTab: (tab: BranchPageTab) => void;
};

const tabs: { label: string; value: BranchPageTab }[] = [
    { label: "General", value: "general" },
    { label: "Run", value: "run" },
    { label: "Diff", value: "diff" },
];

export function BranchPageTabs({
    activeTab,
    onSelectTab,
}: BranchPageTabsProps) {
    return (
        <div
            className="relative z-10 mb-[-1px] flex w-fit items-end pl-1 pr-1"
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
                        className="h-full w-full px-3 text-xs leading-none font-[inherit]"
                        role="tab"
                        type="button"
                        onClick={() => onSelectTab(tab.value)}
                    >
                        {tab.label}
                    </button>
                </TabShell>
            ))}
        </div>
    );
}

export type { BranchPageTab };
