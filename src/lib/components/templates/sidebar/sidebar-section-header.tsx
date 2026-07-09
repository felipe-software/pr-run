import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/lib/components/ui/button";

type SidebarSectionHeaderProps = {
    children: ReactNode;
    count: number;
    onCreateProject?: () => void;
};

export function SidebarSectionHeader({
    children,
    count,
    onCreateProject,
}: SidebarSectionHeaderProps) {
    return (
        <div
            className="group/section-header text-muted-foreground relative flex
                h-7 items-center justify-between gap-2 rounded-md px-2 text-xs
                font-medium tracking-tight"
        >
            <span className="min-w-0 truncate">{children}</span>
            <div className="flex shrink-0 items-center gap-1">
                <span className="tabular-nums">{count}</span>
                {onCreateProject ? (
                    <Button
                        aria-label="Add project"
                        size="icon-xs"
                        variant="ghost"
                        onClick={onCreateProject}
                    >
                        <Plus className="size-3.5" />
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
