import { SidebarContent } from "@/lib/components/templates/sidebar/sidebar-content";
import { SidebarGroupSection } from "@/lib/components/templates/sidebar/sidebar-group-section";
import { SidebarHeader } from "@/lib/components/templates/sidebar/sidebar-header";
import { SidebarRail } from "@/lib/components/templates/sidebar/sidebar-rail";
import { SidebarShell } from "@/lib/components/templates/sidebar/sidebar-shell";
import type { SidebarProps } from "@/lib/components/templates/sidebar/types";

export function Sidebar({
    expandedGroups,
    expandedProjects,
    groups,
    isCreatingScript,
    pendingProjectUpdateId,
    pendingWorktreeRemovalKey,
    selectedBranchName,
    selectedProjectId,
    sidebarWidth,
    theme,
    onAddProject,
    onBeginResize,
    onCreateScript,
    onOpenSshPassphrase,
    onRemoveWorktree,
    onSelectBranch,
    onToggleGroup,
    onToggleProject,
    onToggleTheme,
    onUpdateProject,
}: SidebarProps) {
    return (
        <SidebarShell sidebarWidth={sidebarWidth}>
            <SidebarHeader
                isCreatingScript={isCreatingScript}
                theme={theme}
                onAddProject={onAddProject}
                onCreateScript={onCreateScript}
                onOpenSshPassphrase={onOpenSshPassphrase}
                onToggleTheme={onToggleTheme}
            />

            <SidebarContent>
                {groups.map((group) => (
                    <SidebarGroupSection
                        expandedProjects={expandedProjects}
                        group={group}
                        isExpanded={expandedGroups.has(group.id)}
                        key={group.id}
                        pendingProjectUpdateId={pendingProjectUpdateId}
                        pendingWorktreeRemovalKey={pendingWorktreeRemovalKey}
                        selectedBranchName={selectedBranchName}
                        selectedProjectId={selectedProjectId}
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
