import { RefreshCw } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import { SettingsSection } from "@/lib/components/templates/settings-page/appearance-settings";
import type { ProjectConfig, ProjectGroup } from "@/types/pr-run";

export function ProjectsSettings({
    groups,
    onRefreshProject,
}: {
    groups: ProjectGroup[];
    onRefreshProject: (project: ProjectConfig) => Promise<boolean>;
}) {
    return (
        <SettingsSection
            description="Configured local repositories, grouped the same way as the sidebar."
            title="Projects"
        >
            <div className="grid gap-3">
                {groups.flatMap((group) =>
                    group.projects.map((project) => (
                        <article
                            className="bg-card flex items-center justify-between
                                gap-3 rounded-lg border px-3 py-2.5"
                            key={project.id}
                        >
                            <div className="min-w-0">
                                <h3 className="text-sm font-medium">
                                    {project.name}
                                </h3>
                                <p
                                    className="text-muted-foreground truncate
                                        font-mono text-xs"
                                >
                                    {project.path}
                                </p>
                                <p
                                    className="text-muted-foreground mt-1
                                        text-xs"
                                >
                                    {group.name}
                                </p>
                            </div>
                            <Button
                                aria-label={`Reload ${project.name} worktrees`}
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => onRefreshProject(project)}
                            >
                                <RefreshCw className="size-3.5" />
                            </Button>
                        </article>
                    )),
                )}
            </div>
        </SettingsSection>
    );
}
