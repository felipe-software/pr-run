import { SidebarGroupSection } from "./group-section";
import { SidebarHeader } from "./header";
import type { SidebarProps } from "./types";

export function Sidebar({
    groups,
    branchesByProject,
    branchErrors,
    expandedGroups,
    expandedProjects,
    loadingProjects,
    removingWorktrees,
    selectedProjectId,
    selectedBranch,
    sidebarWidth,
    theme,
    updatingProjects,
    onBeginResize,
    onAddProject,
    onUpdateProject,
    onToggleTheme,
    onOpenSshPassphrase,
    onRemoveWorktree,
    onToggleGroup,
    onToggleProject,
    onSelectBranch,
}: SidebarProps) {
    return (
        <aside
            className="app-sidebar relative flex h-screen min-h-0 shrink-0 flex-col border-r border-border/80"
            style={{ width: `${sidebarWidth}px` }}
        >
            <SidebarHeader
                theme={theme}
                onAddProject={onAddProject}
                onOpenSshPassphrase={onOpenSshPassphrase}
                onToggleTheme={onToggleTheme}
            />

            <div className="min-h-0 flex-1 overflow-auto px-2 pb-4">
                {groups.map((group) => (
                    <SidebarGroupSection
                        branchErrors={branchErrors}
                        branchesByProject={branchesByProject}
                        expandedProjects={expandedProjects}
                        group={group}
                        isExpanded={expandedGroups.has(group.id)}
                        key={group.id}
                        loadingProjects={loadingProjects}
                        removingWorktrees={removingWorktrees}
                        selectedBranch={selectedBranch}
                        selectedProjectId={selectedProjectId}
                        updatingProjects={updatingProjects}
                        onRemoveWorktree={onRemoveWorktree}
                        onSelectBranch={onSelectBranch}
                        onToggleGroup={onToggleGroup}
                        onToggleProject={onToggleProject}
                        onUpdateProject={onUpdateProject}
                    />
                ))}
            </div>

            <div
                aria-hidden="true"
                className="sidebar-resize-handle"
                onMouseDown={onBeginResize}
            />
        </aside>
    );
}

export type { SidebarProps } from "./types";
