import { SidebarEmptyState } from "@/lib/components/templates/sidebar/sidebar-empty-state";
import { SidebarProjectItem } from "@/lib/components/templates/sidebar/sidebar-project-item";
import { SidebarSectionHeader } from "@/lib/components/templates/sidebar/sidebar-section-header";
import type { SidebarProps } from "@/lib/components/templates/sidebar/types";
import type { ProjectGroup } from "@/types/pr-run";

type SidebarGroupSectionProps = Pick<
    SidebarProps,
    | "collapsedProjects"
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
    collapsedProjects,
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
        <section className="py-0.5">
            <SidebarSectionHeader
                count={group.projects.length}
                isExpanded={isExpanded}
                onToggle={() => onToggleGroup(group.id)}
            >
                {group.id === "default" ? "Projects" : group.name}
            </SidebarSectionHeader>

            {isExpanded ? (
                <div className="relative mt-1 flex min-w-0 flex-col gap-0.5">
                    {group.projects.length === 0 ? (
                        <SidebarEmptyState>
                            No projects added.
                        </SidebarEmptyState>
                    ) : null}

                    {group.projects.map((project) => (
                        <SidebarProjectItem
                            isExpanded={!collapsedProjects.has(project.id)}
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
