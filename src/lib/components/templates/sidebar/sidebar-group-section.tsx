import { ChevronDown, ChevronRight } from "lucide-react";

import { SidebarProjectItem } from "@/lib/components/templates/sidebar/sidebar-project-item";
import type { SidebarProps } from "@/lib/components/templates/sidebar/types";
import type { ProjectGroup } from "@/types/pr-run";

type SidebarGroupSectionProps = Pick<
    SidebarProps,
    | "expandedProjects"
    | "pendingProjectUpdateId"
    | "pendingWorktreeRemovalKey"
    | "selectedBranchName"
    | "selectedProjectId"
    | "onRemoveWorktree"
    | "onSelectBranch"
    | "onToggleGroup"
    | "onToggleProject"
    | "onUpdateProject"
> & {
    group: ProjectGroup;
    isExpanded: boolean;
};

export function SidebarGroupSection({
    expandedProjects,
    group,
    isExpanded,
    pendingProjectUpdateId,
    pendingWorktreeRemovalKey,
    selectedBranchName,
    selectedProjectId,
    onRemoveWorktree,
    onSelectBranch,
    onToggleGroup,
    onToggleProject,
    onUpdateProject,
}: SidebarGroupSectionProps) {
    const rowClassName =
        "flex w-full items-center gap-2 px-1.5 py-1.5 text-left text-foreground transition hover:bg-muted/20 hover:text-foreground";

    return (
        <section className="mb-2">
            <button
                aria-expanded={isExpanded}
                className={rowClassName}
                type="button"
                onClick={() => onToggleGroup(group.id)}
            >
                {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 text-[13px] leading-[1.35] tracking-[-0.01em]">
                    {group.id === "default" ? "Projects" : group.name}
                </span>
                <span className="text-[11px] leading-[1.35] text-muted-foreground">
                    {group.projects.length}
                </span>
            </button>

            {isExpanded ? (
                <div className="relative mt-1">
                    {group.projects.length === 0 ? (
                        <div className="ml-2 px-2 py-1.5 text-[11px] leading-[1.45] text-muted-foreground">
                            No projects added.
                        </div>
                    ) : null}

                    {group.projects.map((project) => (
                        <SidebarProjectItem
                            isExpanded={expandedProjects.has(project.id)}
                            isSelected={selectedProjectId === project.id}
                            isUpdatingProject={
                                pendingProjectUpdateId === project.id
                            }
                            key={project.id}
                            pendingWorktreeRemovalKey={
                                pendingWorktreeRemovalKey
                            }
                            project={project}
                            selectedBranchName={
                                selectedProjectId === project.id
                                    ? selectedBranchName
                                    : undefined
                            }
                            onRemoveWorktree={onRemoveWorktree}
                            onSelectBranch={onSelectBranch}
                            onToggleProject={onToggleProject}
                            onUpdateProject={onUpdateProject}
                        />
                    ))}
                </div>
            ) : null}
        </section>
    );
}
