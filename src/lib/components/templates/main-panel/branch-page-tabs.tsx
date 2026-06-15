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
            className="absolute top-[-31px] left-3 z-[3] flex items-end gap-0.5"
            role="tablist"
        >
            {tabs.map((tab) => (
                <button
                    aria-selected={activeTab === tab.value}
                    className={
                        activeTab === tab.value
                            ? "min-w-[86px] translate-y-px rounded-t-md border border-b-0 border-border bg-surface px-3.5 py-2 text-xs font-semibold leading-none text-foreground"
                            : "min-w-[86px] rounded-t-md border border-b-0 border-border bg-background/90 px-3.5 py-2 text-xs font-semibold leading-none text-muted-foreground transition hover:bg-muted/20 hover:text-foreground"
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
