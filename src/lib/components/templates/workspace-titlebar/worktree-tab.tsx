import { X } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { WorktreeTab as WorktreeTabData } from "@/lib/hooks/store/use-workspace-tabs-store";

type WorktreeTabProps = {
    isActive: boolean;
    tab: WorktreeTabData;
    onClose: () => void;
    onSelect: () => void;
};

export function WorktreeTab({
    isActive,
    tab,
    onClose,
    onSelect,
}: WorktreeTabProps) {
    return (
        <div
            className={cn(
                `no-drag group/tab relative flex h-7 max-w-64 min-w-28
                items-center gap-1.5 rounded-md px-2 text-left transition-colors
                duration-150`,
                isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : `text-muted-foreground hover:bg-sidebar-accent/65
                        hover:text-sidebar-accent-foreground`,
            )}
        >
            <button
                aria-selected={isActive}
                className="min-w-0 flex-1 cursor-pointer text-left outline-none
                    focus-visible:ring-2"
                role="tab"
                type="button"
                onClick={onSelect}
            >
                <span
                    className="block truncate text-xs font-medium
                        tracking-tight"
                >
                    {tab.projectName} / {tab.branchName}
                </span>
            </button>
            <button
                aria-label={`Close ${tab.branchName}`}
                className="text-muted-foreground hover:text-foreground
                    focus-visible:ring-ring grid size-5 shrink-0 cursor-pointer
                    place-items-center bg-transparent opacity-0 transition-all
                    outline-none group-focus-within/tab:opacity-100
                    group-hover/tab:opacity-100 focus-visible:opacity-100
                    focus-visible:ring-2"
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onClose();
                }}
            >
                <X className="size-3" />
            </button>
        </div>
    );
}
