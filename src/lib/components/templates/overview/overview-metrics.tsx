import { ArrowDownRight, ArrowUpRight, GitPullRequest } from "lucide-react";
import type { ReactNode } from "react";

import { WorktreeIndicator } from "@/lib/components/atoms/worktree-indicator";
import type { OverviewTotals } from "@/types/overview";

type OverviewMetricsProps = {
    totals: OverviewTotals;
};

const numberFormatter = new Intl.NumberFormat("en-US");

export function OverviewMetrics({ totals }: OverviewMetricsProps) {
    return (
        <section
            aria-label="Overview metrics"
            className="bg-border/70 grid gap-px overflow-hidden rounded-lg
                border sm:grid-cols-2 xl:grid-cols-4"
        >
            <Metric
                icon={<GitPullRequest className="size-4" />}
                label="Open pull requests"
                value={totals.openPullRequests}
            />
            <Metric
                icon={<WorktreeIndicator aria-hidden="true" />}
                label="Worktrees"
                value={totals.worktrees}
            />
            <Metric
                icon={<ArrowUpRight className="size-4" />}
                label="Additions"
                tone="positive"
                value={totals.additions}
            />
            <Metric
                icon={<ArrowDownRight className="size-4" />}
                label="Deletions"
                tone="negative"
                value={totals.deletions}
            />
        </section>
    );
}

function Metric({
    icon,
    label,
    tone = "neutral",
    value,
}: {
    icon: ReactNode;
    label: string;
    tone?: "negative" | "neutral" | "positive";
    value: number;
}) {
    const toneClassName = {
        negative: "text-destructive",
        neutral: "text-muted-foreground",
        positive: "text-success",
    }[tone];

    return (
        <article className="bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
                <span className={toneClassName}>{icon}</span>
                <span className="text-muted-foreground text-[11px] font-medium">
                    {label}
                </span>
            </div>
            <p
                className="mt-2 font-mono text-2xl font-semibold tracking-tight
                    tabular-nums"
            >
                {numberFormatter.format(value)}
            </p>
        </article>
    );
}
