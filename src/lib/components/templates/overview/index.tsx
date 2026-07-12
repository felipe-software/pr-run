import { RefreshCw, TriangleAlert } from "lucide-react";

import { OverviewCharts } from "@/lib/components/templates/overview/overview-charts";
import { OverviewMetrics } from "@/lib/components/templates/overview/overview-metrics";
import { OverviewPrList } from "@/lib/components/templates/overview/overview-pr-list";
import { OverviewRecentPrList } from "@/lib/components/templates/overview/overview-recent-pr-list";
import {
    OverviewEmptyState,
    OverviewErrorState,
    OverviewLoadingState,
} from "@/lib/components/templates/overview/overview-state";
import { Button } from "@/lib/components/ui/button";
import {
    Select,
    SelectContent,
    SelectOption,
    SelectTrigger,
} from "@/lib/components/ui/select";
import { useOverviewQuery } from "@/lib/hooks/query/use-overview-query";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { formatDate } from "@/lib/format";
import { useUiPreferencesStore } from "@/lib/hooks/store/use-ui-preferences-store";
import type { ProjectConfig } from "@/types/pr-run";

type OverviewProps = {
    onProjectChange: (projectId?: string) => void;
    projectId?: string;
    projects: ProjectConfig[];
};

const allProjectsItem = { label: "All projects", value: "all" };

export function Overview({
    onProjectChange,
    projectId,
    projects,
}: OverviewProps) {
    const overviewQuery = useOverviewQuery(projectId);
    const snapshot = overviewQuery.data;
    const dateFormat = useUiPreferencesStore((store) => store.dateFormat);
    const projectItems = [
        allProjectsItem,
        ...projects.map((project) => ({
            label: project.name,
            value: project.id,
        })),
    ];

    return (
        <main className="bg-background min-h-0 flex-1 overflow-auto">
            <div
                className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4
                    py-5 lg:px-6"
            >
                <header
                    className="flex flex-col gap-3 sm:flex-row sm:items-end
                        sm:justify-between"
                >
                    <div>
                        <p
                            className="text-primary text-[11px] font-semibold
                                tracking-[0.16em] uppercase"
                        >
                            Workspace pulse
                        </p>
                        <h1
                            className="mt-1 text-2xl font-semibold
                                tracking-tight"
                        >
                            Overview
                        </h1>
                        <p
                            className="text-muted-foreground mt-1 max-w-2xl
                                text-sm"
                        >
                            Pull request volume, local worktrees, and current
                            code churn.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-44">
                            <Select
                                items={projectItems}
                                value={projectId ?? "all"}
                                onValueChange={(value) =>
                                    onProjectChange(
                                        value === "all" || !value
                                            ? undefined
                                            : value,
                                    )
                                }
                            >
                                <SelectTrigger aria-label="Overview project scope" />
                                <SelectContent>
                                    <SelectOption value="all">
                                        All projects
                                    </SelectOption>
                                    {projects.map((project) => (
                                        <SelectOption
                                            key={project.id}
                                            value={project.id}
                                        >
                                            {project.name}
                                        </SelectOption>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            aria-label="Refresh overview"
                            disabled={overviewQuery.isFetching}
                            size="icon-sm"
                            variant="outline"
                            onClick={() => overviewQuery.refetch()}
                        >
                            <RefreshCw
                                className={
                                    overviewQuery.isFetching
                                        ? "size-4 animate-spin"
                                        : "size-4"
                                }
                            />
                        </Button>
                    </div>
                </header>

                {overviewQuery.isPending ? <OverviewLoadingState /> : null}
                {overviewQuery.error && !snapshot ? (
                    <OverviewErrorState
                        message={getErrorMessage(overviewQuery.error)}
                    />
                ) : null}
                {overviewQuery.error && snapshot ? (
                    <div
                        className="border-warning/30 bg-warning/10
                            text-warning-foreground flex items-start gap-2
                            rounded-lg border px-3 py-2 text-xs"
                    >
                        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                            Refresh failed. Showing the last successful snapshot
                            from {formatDate(snapshot.generatedAt, dateFormat)}.
                        </span>
                    </div>
                ) : null}
                {snapshot ? (
                    <>
                        {snapshot.unavailableProjects.length > 0 ? (
                            <div
                                className="border-warning/30 bg-warning/10
                                    text-warning-foreground flex items-start
                                    gap-2 rounded-lg border px-3 py-2 text-xs"
                            >
                                <TriangleAlert
                                    className="mt-0.5 size-3.5 shrink-0"
                                />
                                <span>
                                    {snapshot.unavailableProjects.length}{" "}
                                    project
                                    {snapshot.unavailableProjects.length === 1
                                        ? " was"
                                        : "s were"}{" "}
                                    unavailable and are excluded from these
                                    totals.
                                </span>
                            </div>
                        ) : null}
                        {snapshot.projects.length === 0 ? (
                            <OverviewEmptyState />
                        ) : (
                            <>
                                <OverviewMetrics totals={snapshot.totals} />
                                <div
                                    className="grid gap-4
                                        xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]"
                                >
                                    <OverviewCharts
                                        projectScoped={Boolean(projectId)}
                                        projects={snapshot.projects}
                                        pullRequests={snapshot.pullRequests}
                                    />
                                    <OverviewPrList
                                        pullRequests={snapshot.pullRequests}
                                    />
                                </div>
                                <OverviewRecentPrList
                                    pullRequests={snapshot.recentPullRequests}
                                />
                            </>
                        )}
                    </>
                ) : null}
            </div>
        </main>
    );
}
