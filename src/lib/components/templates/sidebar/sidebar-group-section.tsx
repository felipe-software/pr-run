import { autoAnimate } from "@formkit/auto-animate";
import { useCallback, useRef } from "react";

import { SidebarEmptyState } from "@/lib/components/templates/sidebar/sidebar-empty-state";
import { SidebarProjectItem } from "@/lib/components/templates/sidebar/sidebar-project-item";
import { sortProjectsByBusyState } from "@/lib/components/templates/sidebar/sidebar-sort";
import { SidebarSectionHeader } from "@/lib/components/templates/sidebar/sidebar-section-header";
import type { SidebarProps } from "@/lib/components/templates/sidebar/types";
import type { ProjectGroup } from "@/types/pr-run";

type SidebarGroupSectionProps = Pick<
    SidebarProps,
    | "busyOwnerKeys"
    | "busyProjectIds"
    | "collapsedProjects"
    | "pendingProjectUpdateId"
    | "pendingWorktreeCheckoutKey"
    | "pendingWorktreeRemovalKey"
    | "projectAvatarUris"
    | "selectedBranchName"
    | "selectedProjectId"
    | "onCheckoutBranch"
    | "onOpenAddProject"
    | "onOpenProject"
    | "onRemoveWorktree"
    | "onSelectBranch"
    | "onToggleProject"
    | "onUpdateProject"
> & {
    group: ProjectGroup;
};

export function SidebarGroupSection({
    busyOwnerKeys,
    busyProjectIds,
    collapsedProjects,
    group,
    pendingProjectUpdateId,
    pendingWorktreeCheckoutKey,
    pendingWorktreeRemovalKey,
    projectAvatarUris,
    selectedBranchName,
    selectedProjectId,
    onCheckoutBranch,
    onOpenAddProject,
    onOpenProject,
    onRemoveWorktree,
    onSelectBranch,
    onToggleProject,
    onUpdateProject,
}: SidebarGroupSectionProps) {
    const animatedProjectLists = useRef(new WeakSet<HTMLElement>());
    const attachProjectListAnimation = useCallback(
        (node: HTMLDivElement | null) => {
            if (!node || animatedProjectLists.current.has(node)) {
                return;
            }

            autoAnimate(node, { duration: 180, easing: "ease-out" });
            animatedProjectLists.current.add(node);
        },
        [],
    );
    const sortedProjects = sortProjectsByBusyState(
        group.projects,
        busyProjectIds,
    );

    return (
        <section className="pb-0.5">
            <SidebarSectionHeader
                count={group.projects.length}
                onCreateProject={
                    group.id === "default" ? onOpenAddProject : undefined
                }
            >
                {group.id === "default" ? "Projects" : group.name}
            </SidebarSectionHeader>

            <div
                ref={attachProjectListAnimation}
                className="relative flex min-w-0 flex-col gap-0.5"
            >
                {group.projects.length === 0 ? (
                    <SidebarEmptyState>No projects added.</SidebarEmptyState>
                ) : null}

                {sortedProjects.map((project) => (
                    <SidebarProjectItem
                        busyOwnerKeys={busyOwnerKeys}
                        isExpanded={!collapsedProjects.has(project.id)}
                        isBusy={busyProjectIds.has(project.id)}
                        isSelected={selectedProjectId === project.id}
                        isUpdatingProject={
                            pendingProjectUpdateId === project.id
                        }
                        key={project.id}
                        pendingWorktreeRemovalKey={pendingWorktreeRemovalKey}
                        pendingWorktreeCheckoutKey={pendingWorktreeCheckoutKey}
                        projectAvatarUri={projectAvatarUris.get(project.id)}
                        project={project}
                        selectedBranchName={
                            selectedProjectId === project.id
                                ? selectedBranchName
                                : undefined
                        }
                        onCheckoutBranch={onCheckoutBranch}
                        onRemoveWorktree={onRemoveWorktree}
                        onOpenProject={onOpenProject}
                        onSelectBranch={onSelectBranch}
                        onToggleProject={onToggleProject}
                        onUpdateProject={onUpdateProject}
                    />
                ))}
            </div>
        </section>
    );
}
