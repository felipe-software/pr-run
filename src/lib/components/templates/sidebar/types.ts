import type { ProjectConfig, ProjectGroup } from "@/types/pr-run";

export type SidebarProps = {
    expandedGroups: Set<string>;
    expandedProjects: Set<string>;
    groups: ProjectGroup[];
    isCreatingScript: boolean;
    pendingProjectUpdateId?: string;
    pendingWorktreeRemovalKey?: string;
    selectedBranchName?: string;
    selectedProjectId?: string;
    sidebarWidth: number;
    theme: "dark" | "light";
    onAddProject: () => void;
    onBeginResize: () => void;
    onCreateScript: () => void;
    onOpenSshPassphrase: () => void;
    onRemoveWorktree: (projectId: string, branchName: string) => Promise<void>;
    onSelectBranch: (projectId: string, branchName: string) => void;
    onToggleGroup: (groupId: string) => void;
    onToggleProject: (projectId: string) => void;
    onToggleTheme: () => void;
    onUpdateProject: (project: ProjectConfig) => Promise<void>;
};
