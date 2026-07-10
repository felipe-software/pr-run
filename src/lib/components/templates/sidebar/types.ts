import type { BranchInfo, ProjectConfig, ProjectGroup } from "@/types/pr-run";
import type { ProjectAvatarUris } from "@/lib/project-avatar";

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
    projectAvatarUris: ProjectAvatarUris;
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
    onUpdateProject: (project: ProjectConfig) => Promise<boolean>;
};
