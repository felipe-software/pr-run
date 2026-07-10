import type {
    OverviewProjectSummary,
    OverviewPullRequestChange,
} from "@/types/overview";

type OverviewChartsProps = {
    projects: OverviewProjectSummary[];
    pullRequests: OverviewPullRequestChange[];
    projectScoped: boolean;
};

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
});

export function OverviewCharts({
    projects,
    pullRequests,
    projectScoped,
}: OverviewChartsProps) {
    const rows = projectScoped
        ? pullRequests.slice(0, 7).map((pullRequest) => ({
              additions: pullRequest.additions,
              deletions: pullRequest.deletions,
              label: `#${pullRequest.number} ${pullRequest.branchName}`,
              secondary: pullRequest.title,
          }))
        : projects.slice(0, 7).map((project) => ({
              additions: project.additions,
              deletions: project.deletions,
              label: project.projectName,
              secondary: `${project.openPullRequests} open PRs`,
          }));
    const maximum = Math.max(
        1,
        ...rows.flatMap((row) => [row.additions, row.deletions]),
    );

    return (
        <section
            aria-label="Additions and deletions"
            className="bg-surface rounded-lg border"
        >
            <header
                className="flex items-baseline justify-between border-b px-4
                    py-3"
            >
                <div>
                    <h2 className="text-sm font-semibold tracking-tight">
                        Additions vs. deletions
                    </h2>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                        {projectScoped
                            ? "The open pull requests with the most changed lines"
                            : "Current open pull requests grouped by project"}
                    </p>
                </div>
                <span className="text-muted-foreground font-mono text-[10px]">
                    lines changed
                </span>
            </header>
            {rows.length > 0 ? (
                <div className="space-y-3 px-4 py-4">
                    {rows.map((row) => (
                        <article className="grid gap-1.5" key={row.label}>
                            <div
                                className="flex min-w-0 items-baseline
                                    justify-between gap-3"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-medium">
                                        {row.label}
                                    </p>
                                    <p
                                        className="text-muted-foreground
                                            truncate text-[10px]"
                                    >
                                        {row.secondary}
                                    </p>
                                </div>
                                <span
                                    className="shrink-0 font-mono text-[10px]
                                        tabular-nums"
                                >
                                    <span className="text-success">
                                        +
                                        {compactNumberFormatter.format(
                                            row.additions,
                                        )}
                                    </span>
                                    <span className="text-muted-foreground px-1">
                                        /
                                    </span>
                                    <span className="text-destructive">
                                        -
                                        {compactNumberFormatter.format(
                                            row.deletions,
                                        )}
                                    </span>
                                </span>
                            </div>
                            <div
                                className="grid grid-cols-2 gap-1"
                                aria-hidden="true"
                            >
                                <progress
                                    className="h-1.5 w-full overflow-hidden
                                        rounded-sm accent-[var(--success)]"
                                    max={maximum}
                                    value={row.additions}
                                />
                                <progress
                                    className="h-1.5 w-full rotate-180
                                        overflow-hidden rounded-sm
                                        accent-[var(--destructive)]"
                                    max={maximum}
                                    value={row.deletions}
                                />
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <p
                    className="text-muted-foreground px-4 py-10 text-center
                        text-sm"
                >
                    No open pull requests have diff statistics yet.
                </p>
            )}
        </section>
    );
}
