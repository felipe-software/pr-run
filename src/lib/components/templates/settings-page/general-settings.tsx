import { useEffect, useState } from "react";

import { getBackendUrl } from "@/lib/api";
import { Button } from "@/lib/components/ui/button";
import { toast } from "@/lib/components/ui/toast";
import { SettingsSection } from "@/lib/components/templates/settings-page/appearance-settings";
import { tryPromise } from "@/lib/error";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ProjectConfig } from "@/types/pr-run";

export function GeneralSettings({
    projects,
    onRefreshProject,
}: {
    onRefreshProject: (project: ProjectConfig) => Promise<boolean>;
    projects: ProjectConfig[];
}) {
    const [backendUrl, setBackendUrl] = useState(
        "Loading local backend URL...",
    );
    const [backendError, setBackendError] = useState<string>();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        async function loadBackendUrl() {
            const [error, url] = await tryPromise(getBackendUrl());

            if (error) {
                setBackendError(getErrorMessage(error));
                setBackendUrl("Unavailable");
                return;
            }

            setBackendUrl(url);
        }

        loadBackendUrl();
    }, []);

    async function refreshAll() {
        setIsRefreshing(true);
        for (const project of projects) {
            const [error, didRefresh] = await tryPromise(
                onRefreshProject(project),
            );
            if (error || !didRefresh) {
                if (error) {
                    toast.error(getErrorMessage(error));
                }
                break;
            }
        }
        setIsRefreshing(false);
    }

    return (
        <SettingsSection
            description="Connection details and project refresh controls."
            title="General"
        >
            <dl className="bg-card grid gap-3 rounded-lg border p-3 text-sm">
                <div>
                    <dt className="text-muted-foreground">Backend URL</dt>
                    <dd className="mt-1 font-mono text-xs">{backendUrl}</dd>
                    {backendError ? (
                        <dd className="text-danger mt-1 text-xs">
                            {backendError}
                        </dd>
                    ) : null}
                </div>
                <div>
                    <dt className="text-muted-foreground">
                        Configured projects
                    </dt>
                    <dd className="mt-1 tabular-nums">{projects.length}</dd>
                </div>
            </dl>
            <Button
                disabled={isRefreshing || projects.length === 0}
                onClick={refreshAll}
            >
                {isRefreshing ? "Refreshing..." : "Refresh all projects"}
            </Button>
        </SettingsSection>
    );
}
