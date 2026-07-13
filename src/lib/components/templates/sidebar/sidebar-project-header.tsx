import { ChevronDown, ChevronRight, Eye, RefreshCw } from "lucide-react";

import { BusyIcon } from "@/lib/components/atoms/busy-icon";
import { ProjectAvatar } from "@/lib/components/atoms/project-avatar";
import { Button } from "@/lib/components/ui/button";
import { shortenPath } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import type { ProjectConfig } from "@/types/pr-run";

type SidebarProjectHeaderProps = {
    isBusy: boolean;
    isExpanded: boolean;
    isSelected: boolean;
    isUpdatingProject: boolean;
    project: ProjectConfig;
    projectAvatarUri?: string;
    onOpenProject: (projectId: string) => void;
    onToggleProject: (projectId: string) => void;
    onUpdateProject: (project: ProjectConfig) => Promise<boolean>;
};

export function SidebarProjectHeader({
    isBusy,
    isExpanded,
    isSelected,
    isUpdatingProject,
    project,
    projectAvatarUri,
    onOpenProject,
    onToggleProject,
    onUpdateProject,
}: SidebarProjectHeaderProps) {
    return (
        <div
            className="bg-sidebar sticky top-0 isolate z-10 flex h-8
                items-stretch py-0.5"
        >
            <div
                className={cn(
                    `group hover:bg-sidebar-accent relative flex min-w-0 flex-1
                    items-stretch rounded-md transition-colors`,
                    isSelected && "text-sidebar-accent-foreground",
                )}
                style={
                    isSelected
                        ? { backgroundColor: "rgba(255, 255, 255, 0.07)" }
                        : undefined
                }
            >
                <button
                    aria-expanded={isExpanded}
                    data-active={isSelected}
                    className={cn(
                        `text-sidebar-foreground
                        hover:text-sidebar-accent-foreground
                        focus-visible:ring-ring flex min-w-0 flex-1
                        cursor-pointer items-center overflow-hidden rounded-md
                        px-1.5 text-left outline-none focus-visible:ring-2`,
                        isSelected && "text-sidebar-accent-foreground",
                    )}
                    type="button"
                    onClick={() => onToggleProject(project.id)}
                >
                    {isExpanded ? (
                        <ChevronDown
                            className="text-muted-foreground/70 mr-1 size-3
                                shrink-0"
                        />
                    ) : (
                        <ChevronRight
                            className="text-muted-foreground/70 mr-1 size-3
                                shrink-0"
                        />
                    )}
                    <span
                        className="relative flex h-5 w-5 flex-none items-center
                            justify-center"
                    >
                        {projectAvatarUri ? (
                            <ProjectAvatar
                                className="size-5"
                                src={projectAvatarUri}
                            />
                        ) : null}
                        {isBusy ? (
                            <BusyIcon
                                className="absolute -right-1 -bottom-1"
                                size="sm"
                            />
                        ) : null}
                    </span>
                    <div className="ml-2 flex min-w-0 flex-1 justify-between">
                        <span
                            className="block truncate text-xs leading-4
                                font-medium tracking-tight"
                        >
                            {project.name}
                        </span>
                        <span
                            className={cn(
                                `text-muted-foreground/65 pointer-events-none
                                block truncate text-[10px] leading-4
                                transition-opacity duration-150
                                group-focus-within/menu-item:opacity-0
                                group-hover/menu-item:opacity-0`,
                                isUpdatingProject && "opacity-0",
                            )}
                        >
                            {shortenPath(project.path)}
                        </span>
                    </div>
                </button>
                <div
                    className={cn(
                        `pointer-events-none absolute inset-y-0 right-0 flex
                        items-center px-1 opacity-0 transition-opacity
                        duration-150
                        group-focus-within/menu-item:pointer-events-auto
                        group-focus-within/menu-item:opacity-100
                        group-hover/menu-item:pointer-events-auto
                        group-hover/menu-item:opacity-100`,
                        isUpdatingProject && "pointer-events-auto opacity-100",
                    )}
                >
                    <Button
                        aria-label={`Open ${project.name} overview`}
                        className="text-muted-foreground/65"
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenProject(project.id)}
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        aria-label={`Reload ${project.name} worktrees`}
                        className="text-muted-foreground/65"
                        disabled={isUpdatingProject}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                        onClick={() => onUpdateProject(project)}
                    >
                        <RefreshCw
                            className={cn(
                                "h-3.5 w-3.5",
                                isUpdatingProject && "animate-spin",
                            )}
                        />
                    </Button>
                </div>
            </div>
        </div>
    );
}
