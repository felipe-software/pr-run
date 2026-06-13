import { ChevronDown, ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";
import type { BranchInfo, ProjectGroup } from "@/types/pr-run";
import { SidebarProjectItem } from "@/components/templates/sidebar/project-item";

type SidebarGroupSectionProps = {
    branchErrors: Record<string, string | undefined>;
    branchesByProject: Record<string, BranchInfo[]>;
    group: ProjectGroup;
    isExpanded: boolean;
    expandedProjects: Set<string>;
    loadingProjects: Set<string>;
    removingWorktrees: Set<string>;
    selectedBranch?: string;
    selectedProjectId?: string;
    updatingProjects: Set<string>;
    onRemoveWorktree: SidebarProjectItemProps["onRemoveWorktree"];
    onSelectBranch: SidebarProjectItemProps["onSelectBranch"];
    onToggleGroup: (groupId: string) => void;
    onToggleProject: SidebarProjectItemProps["onToggleProject"];
    onUpdateProject: SidebarProjectItemProps["onUpdateProject"];
};

type SidebarProjectItemProps = ComponentProps<typeof SidebarProjectItem>;

export function SidebarGroupSection({
    branchErrors,
    branchesByProject,
    expandedProjects,
    group,
    isExpanded,
    loadingProjects,
    removingWorktrees,
    selectedBranch,
    selectedProjectId,
    updatingProjects,
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
                            branches={branchesByProject[project.id] ?? []}
                            error={branchErrors[project.id]}
                            isExpanded={expandedProjects.has(project.id)}
                            isLoading={loadingProjects.has(project.id)}
                            isSelected={selectedProjectId === project.id}
                            isUpdatingProject={updatingProjects.has(project.id)}
                            key={project.id}
                            project={project}
                            removingWorktrees={removingWorktrees}
                            selectedBranch={
                                selectedProjectId === project.id
                                    ? selectedBranch
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
