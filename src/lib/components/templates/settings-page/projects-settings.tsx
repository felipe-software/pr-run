import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/lib/components/ui/button";
import { SettingsSection } from "@/lib/components/templates/settings-page/appearance-settings";
import { tryPromise } from "@/lib/error";
import { toast } from "@/lib/components/ui/toast";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ProjectConfig, ProjectGroup } from "@/types/pr-run";

export function ProjectsSettings({
    groups,
    onRefreshProject,
}: {
    groups: ProjectGroup[];
    onRefreshProject: (project: ProjectConfig) => Promise<boolean>;
}) {
    const [refreshingProjectId, setRefreshingProjectId] = useState<string>();

    async function refreshProject(project: ProjectConfig) {
        setRefreshingProjectId(project.id);
        const [error] = await tryPromise(onRefreshProject(project));
        setRefreshingProjectId(undefined);

        if (error) {
            toast.error(getErrorMessage(error));
        }
    }

    return (
        <SettingsSection
            description="Configured local repositories, grouped the same way as the sidebar."
            title="Projects"
        >
            <div className="flex flex-col gap-3">
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
                                disabled={refreshingProjectId === project.id}
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => refreshProject(project)}
                            >
                                <RefreshCw
                                    className={
                                        refreshingProjectId === project.id
                                            ? "size-3.5 animate-spin"
                                            : "size-3.5"
                                    }
                                />
                            </Button>
                        </article>
                    )),
                )}
            </div>
        </SettingsSection>
    );
}
