import { SidebarContent } from "@/lib/components/templates/sidebar/sidebar-content";
import { SidebarFooter } from "@/lib/components/templates/sidebar/sidebar-footer";
import { SidebarGroupSection } from "@/lib/components/templates/sidebar/sidebar-group-section";
import { SidebarOverviewButton } from "@/lib/components/templates/sidebar/sidebar-overview-button";
import { SidebarRail } from "@/lib/components/templates/sidebar/sidebar-rail";
import { SidebarShell } from "@/lib/components/templates/sidebar/sidebar-shell";
import type { SidebarProps } from "@/lib/components/templates/sidebar/types";

export function Sidebar({
    busyOwnerKeys,
    busyProjectIds,
    collapsedProjects,
    groups,
    isDesktopHidden,
    isMobileOpen,
    isOverviewActive,
    isSettingsActive,
    pendingProjectUpdateId,
    pendingWorktreeCheckoutKey,
    pendingWorktreeRemovalKey,
    projectAvatarUris,
    selectedBranchName,
    selectedProjectId,
    sidebarWidth,
    onBeginResize,
    onCheckoutBranch,
    onOpenAddProject,
    onOpenOverview,
    onOpenSettings,
    onRemoveWorktree,
    onSelectBranch,
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
                <SidebarOverviewButton
                    isActive={isOverviewActive}
                    onClick={onOpenOverview}
                />
                {groups.map((group) => (
                    <SidebarGroupSection
                        busyOwnerKeys={busyOwnerKeys}
                        busyProjectIds={busyProjectIds}
                        collapsedProjects={collapsedProjects}
                        group={group}
                        key={group.id}
                        pendingProjectUpdateId={pendingProjectUpdateId}
                        pendingWorktreeCheckoutKey={pendingWorktreeCheckoutKey}
                        projectAvatarUris={projectAvatarUris}
                        pendingWorktreeRemovalKey={pendingWorktreeRemovalKey}
                        selectedBranchName={selectedBranchName}
                        selectedProjectId={selectedProjectId}
                        onCheckoutBranch={onCheckoutBranch}
                        onOpenAddProject={onOpenAddProject}
                        onRemoveWorktree={onRemoveWorktree}
                        onSelectBranch={onSelectBranch}
                        onToggleProject={onToggleProject}
                        onUpdateProject={onUpdateProject}
                    />
                ))}
            </SidebarContent>
            <SidebarFooter
                isSettingsActive={isSettingsActive}
                onOpenSettings={onOpenSettings}
            />

            <SidebarRail onBeginResize={onBeginResize} />
        </SidebarShell>
    );
}
