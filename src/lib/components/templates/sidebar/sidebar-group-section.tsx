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
    return (
        <section className="mb-2">
            <button
                aria-expanded={isExpanded}
                className="tree-row tree-group-row"
                type="button"
                onClick={() => onToggleGroup(group.id)}
            >
                {isExpanded ? (
                    <ChevronDown className="tree-chevron" />
                ) : (
                    <ChevronRight className="tree-chevron" />
                )}
                <span className="tree-label flex-1">
                    {group.id === "default" ? "Projects" : group.name}
                </span>
                <span className="tree-meta">{group.projects.length}</span>
            </button>

            {isExpanded ? (
                <div className="tree-children">
                    {group.projects.length === 0 ? (
                        <div className="tree-empty">No projects added.</div>
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
