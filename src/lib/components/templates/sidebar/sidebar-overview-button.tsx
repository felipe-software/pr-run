import { ChartNoAxesCombined } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type SidebarOverviewButtonProps = {
    isActive: boolean;
    onClick: () => void;
};

export function SidebarOverviewButton({
    isActive,
    onClick,
}: SidebarOverviewButtonProps) {
    return (
        <button
            aria-current={isActive ? "page" : undefined}
            className={cn(
                `focus-visible:ring-ring flex h-8 w-full items-center gap-2
                rounded-md px-2 text-left text-xs font-medium transition-colors
                outline-none focus-visible:ring-2`,
                isActive
                    ? "bg-primary/12 text-foreground"
                    : `text-muted-foreground hover:bg-sidebar-accent
                        hover:text-sidebar-accent-foreground`,
            )}
            type="button"
            onClick={onClick}
        >
            <ChartNoAxesCombined className="size-3.5" />
            <span>Overview</span>
        </button>
    );
}
