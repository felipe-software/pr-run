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
                <button
                    aria-selected={activeTab === tab.value}
                    className={
                        activeTab === tab.value
                            ? "-mr-px h-8 min-w-[84px] rounded-t-md border border-b-0 border-border bg-surface px-3 text-xs font-semibold leading-none text-foreground"
                            : "-mr-px h-8 min-w-[84px] rounded-t-md border border-b-0 border-border bg-background/90 px-3 text-xs font-medium leading-none text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
                    }
                    key={tab.value}
                    role="tab"
                    type="button"
                    onClick={() => onSelectTab(tab.value)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export type { BranchPageTab };
