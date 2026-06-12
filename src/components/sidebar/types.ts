import type {
    BranchInfo,
    ProjectConfig,
    ProjectGroup,
} from "../../types/pr-run";

export type SidebarProps = {
    groups: ProjectGroup[];
    branchesByProject: Record<string, BranchInfo[]>;
    branchErrors: Record<string, string | undefined>;
    expandedGroups: Set<string>;
    expandedProjects: Set<string>;
    loadingProjects: Set<string>;
    removingWorktrees: Set<string>;
    selectedProjectId?: string;
    selectedBranch?: string;
    sidebarWidth: number;
    theme: "dark" | "light";
    updatingProjects: Set<string>;
    onBeginResize: () => void;
    onAddProject: () => void;
    onUpdateProject: (project: ProjectConfig) => Promise<unknown>;
    onToggleTheme: () => void;
    onOpenSshPassphrase: () => void;
    onRemoveWorktree: (
        project: ProjectConfig,
        branch: BranchInfo,
    ) => Promise<void>;
    onToggleGroup: (groupId: string) => void;
    onToggleProject: (project: ProjectConfig) => Promise<void>;
    onSelectBranch: (
        project: ProjectConfig,
        branch: BranchInfo,
    ) => Promise<void>;
};
