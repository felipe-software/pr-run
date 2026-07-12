import type { ProjectConfig } from "@/types/pr-run";

export type SelectedBranchState = {
    branchName: string;
    projectId: string;
};

export type BranchPageTab = "activity" | "run" | "changes" | "docker" | "env";

export type SelectedBranchView = {
    branchName: string | null;
    project: ProjectConfig | null;
};

export type SettingsSection =
    | "general"
    | "appearance"
    | "hotkeys"
    | "projects"
    | "scripts"
    | "ssh"
    | "diagnostics";

export type WorkspaceView =
    | { type: "branch" }
    | { section: SettingsSection; type: "settings" };
