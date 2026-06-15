import { SidebarGroupSection } from "@/lib/components/templates/sidebar/sidebar-group-section";
import { SidebarHeader } from "@/lib/components/templates/sidebar/sidebar-header";
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
        <aside
            className="relative flex h-screen min-h-0 shrink-0 flex-col border-r border-border/80 bg-background/90 [font-family:'SF_Pro_Display','Geist_Sans','Helvetica_Neue','Avenir_Next','Segoe_UI',sans-serif]"
            style={{ width: `${sidebarWidth}px` }}
        >
            <SidebarHeader
                isCreatingScript={isCreatingScript}
                theme={theme}
                onAddProject={onAddProject}
                onCreateScript={onCreateScript}
                onOpenSshPassphrase={onOpenSshPassphrase}
                onToggleTheme={onToggleTheme}
            />

            <div className="min-h-0 flex-1 overflow-auto px-2 pb-4">
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
            </div>

            <div
                aria-hidden="true"
                className="absolute top-0 right-[-4px] h-full w-2 cursor-col-resize after:absolute after:top-0 after:left-[3px] after:h-full after:w-px after:bg-border after:content-['']"
                onMouseDown={onBeginResize}
            />
        </aside>
    );
}
