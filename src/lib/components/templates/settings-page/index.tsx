import { AppearanceSettings } from "@/lib/components/templates/settings-page/appearance-settings";
import { DiagnosticsSettings } from "@/lib/components/templates/settings-page/diagnostics-settings";
import { GeneralSettings } from "@/lib/components/templates/settings-page/general-settings";
import { ProjectsSettings } from "@/lib/components/templates/settings-page/projects-settings";
import { ScriptsSettings } from "@/lib/components/templates/settings-page/scripts-settings";
import { SettingsLayout } from "@/lib/components/templates/settings-page/settings-layout";
import { SshSettings } from "@/lib/components/templates/settings-page/ssh-settings";
import type { SettingsPageProps } from "@/lib/components/templates/settings-page/types";

export function SettingsPage(props: SettingsPageProps) {
    const projects = props.groups.flatMap((group) => group.projects);
    const content = {
        appearance: <AppearanceSettings />,
        diagnostics: (
            <DiagnosticsSettings
                projectCount={projects.length}
                summary={props.summary}
            />
        ),
        general: (
            <GeneralSettings
                projects={projects}
                onRefreshProject={props.onRefreshProject}
            />
        ),
        projects: (
            <ProjectsSettings
                groups={props.groups}
                onRefreshProject={props.onRefreshProject}
            />
        ),
        scripts: <ScriptsSettings onCreateScript={props.onCreateScript} />,
        ssh: <SshSettings onOpen={props.onOpenSshPassphrase} />,
    }[props.section];

    return (
        <SettingsLayout
            onClose={props.onClose}
            onSelectSection={props.onSelectSection}
            section={props.section}
        >
            {content}
        </SettingsLayout>
    );
}
