import { SidebarContent } from "@/lib/components/templates/sidebar/sidebar-content";
import { SidebarGroupSection } from "@/lib/components/templates/sidebar/sidebar-group-section";
import { SidebarOverviewButton } from "@/lib/components/templates/sidebar/sidebar-overview-button";
import { SidebarRail } from "@/lib/components/templates/sidebar/sidebar-rail";
import { SidebarShell } from "@/lib/components/templates/sidebar/sidebar-shell";
import type { SidebarProps } from "@/lib/components/templates/sidebar/types";

export function Sidebar({
    busyOwnerKeys,
    busyProjectIds,
    collapsedProjects,
    expandedGroups,
    groups,
    isDesktopHidden,
    isMobileOpen,
    isOverviewActive,
    pendingProjectUpdateId,
    pendingWorktreeCheckoutKey,
    pendingWorktreeRemovalKey,
    selectedBranchName,
    selectedProjectId,
    sidebarWidth,
    onBeginResize,
    onCheckoutBranch,
    onOpenOverview,
    onRemoveWorktree,
    onSelectBranch,
    onToggleGroup,
    onToggleProject,
    onUpdateProject,
}: SidebarProps) {
    return (
        <SidebarShell
            isDesktopHidden={isDesktopHidden}
            isMobileOpen={isMobileOpen}
            sidebarWidth={sidebarWidth}
        >
            <SidebarContent>
                <div className="px-0.5 pt-1.5 pb-1">
                    <SidebarOverviewButton
                        isActive={isOverviewActive}
                        onClick={onOpenOverview}
                    />
                </div>
                {groups.map((group) => (
                    <SidebarGroupSection
                        busyOwnerKeys={busyOwnerKeys}
                        busyProjectIds={busyProjectIds}
                        collapsedProjects={collapsedProjects}
                        group={group}
                        isExpanded={expandedGroups.has(group.id)}
                        key={group.id}
                        pendingProjectUpdateId={pendingProjectUpdateId}
                        pendingWorktreeCheckoutKey={pendingWorktreeCheckoutKey}
                        pendingWorktreeRemovalKey={pendingWorktreeRemovalKey}
                        selectedBranchName={selectedBranchName}
                        selectedProjectId={selectedProjectId}
                        onCheckoutBranch={onCheckoutBranch}
                        onRemoveWorktree={onRemoveWorktree}
                        onSelectBranch={onSelectBranch}
                        onToggleGroup={onToggleGroup}
                        onToggleProject={onToggleProject}
                        onUpdateProject={onUpdateProject}
                    />
                ))}
            </SidebarContent>

            <SidebarRail onBeginResize={onBeginResize} />
        </SidebarShell>
    );
}
