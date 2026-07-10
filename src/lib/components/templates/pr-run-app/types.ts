import type { ProjectConfig } from "@/types/pr-run";

export type SelectedBranchState = {
    branchName: string;
    projectId: string;
};

export type SelectedBranchView = {
    branchName: string | null;
    project: ProjectConfig | null;
};

export type SettingsSection =
    | "general"
    | "appearance"
    | "projects"
    | "scripts"
    | "ssh"
    | "diagnostics";

export type WorkspaceView =
    | { type: "branch" }
    | { section: SettingsSection; type: "settings" };
