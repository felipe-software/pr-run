import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type SidebarSectionHeaderProps = {
    children: ReactNode;
    count: number;
    isExpanded: boolean;
    onToggle: () => void;
};

export function SidebarSectionHeader({
    children,
    count,
    isExpanded,
    onToggle,
}: SidebarSectionHeaderProps) {
    return (
        <button
            aria-expanded={isExpanded}
            className="text-muted-foreground/60 hover:bg-sidebar-accent
                hover:text-sidebar-accent-foreground focus-visible:ring-ring
                flex w-full items-center justify-between gap-2 rounded-md px-2
                py-1.5 text-left text-[10px] font-medium tracking-wider
                uppercase transition-colors outline-none focus-visible:ring-2"
            type="button"
            onClick={onToggle}
        >
            <span className="flex min-w-0 items-center gap-1.5">
                {isExpanded ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                )}
                <span className="min-w-0 truncate">{children}</span>
            </span>
            <span className="tabular-nums">{count}</span>
        </button>
    );
}
