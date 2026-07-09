import type { BranchInfo, ProjectConfig, ProjectGroup } from "@/types/pr-run";

export type SidebarProps = {
    busyOwnerKeys: Set<string>;
    busyProjectIds: Set<string>;
    collapsedProjects: Set<string>;
    groups: ProjectGroup[];
    isDesktopHidden?: boolean;
    isMobileOpen?: boolean;
    isOverviewActive: boolean;
    isSettingsActive: boolean;
    pendingProjectUpdateId?: string;
    pendingWorktreeCheckoutKey?: string;
    pendingWorktreeRemovalKey?: string;
    selectedBranchName?: string;
    selectedProjectId?: string;
    sidebarWidth: number;
    onBeginResize: () => void;
    onCheckoutBranch: (projectId: string, branchName: string) => Promise<void>;
    onOpenAddProject: () => void;
    onOpenOverview: () => void;
    onOpenSettings: () => void;
    onRemoveWorktree: (projectId: string, branchName: string) => Promise<void>;
    onSelectBranch: (project: ProjectConfig, branch: BranchInfo) => void;
    onToggleProject: (projectId: string) => void;
    onUpdateProject: (project: ProjectConfig) => Promise<void>;
};
