import { X } from "lucide-react";

import { ProjectAvatar } from "@/lib/components/atoms/project-avatar";
import { cn } from "@/lib/utils/cn";
import type { WorktreeTab as WorktreeTabData } from "@/lib/hooks/store/use-workspace-tabs-store";

type WorktreeTabProps = {
    isActive: boolean;
    tab: WorktreeTabData;
    projectAvatarUri?: string;
    onClose: () => void;
    onSelect: () => void;
};

export function WorktreeTab({
    isActive,
    tab,
    projectAvatarUri,
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
            onAuxClick={(event) => {
                if (event.button === 1) {
                    event.preventDefault();
                    onClose();
                }
            }}
        >
            <button
                aria-selected={isActive}
                className="flex min-w-0 flex-1 cursor-pointer items-center
                    text-left outline-none focus-visible:ring-2"
                role="tab"
                type="button"
                onClick={onSelect}
            >
                {projectAvatarUri ? (
                    <ProjectAvatar
                        className="mr-1.5 size-4 shrink-0"
                        src={projectAvatarUri}
                    />
                ) : null}
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
                    place-items-center bg-transparent outline-none
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
