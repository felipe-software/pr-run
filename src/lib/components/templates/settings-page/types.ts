import type { AppStatusSummary } from "@/lib/components/templates/pr-run-app/use-app-status-summary";
import type { SettingsSection } from "@/lib/components/templates/pr-run-app/types";
import type { ProjectConfig, ProjectGroup } from "@/types/pr-run";

export type SettingsPageProps = {
    groups: ProjectGroup[];
    onClose: () => void;
    onCreateScript: () => void;
    onOpenSshPassphrase: () => void;
    onRefreshProject: (project: ProjectConfig) => Promise<void>;
    onSelectSection: (section: SettingsSection) => void;
    section: SettingsSection;
    summary: AppStatusSummary;
};
