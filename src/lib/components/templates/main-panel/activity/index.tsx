import { GitCommitHorizontal } from "lucide-react";

import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { ActivityItem } from "@/lib/components/templates/main-panel/activity/activity-item";
import { CommitRow } from "@/lib/components/templates/main-panel/activity/commit-row";
import { ReviewComposer } from "@/lib/components/templates/main-panel/activity/review-composer";
import type { WorktreeActivityResult } from "@/types/pr-run";

type WorktreeActivityProps = {
    baseBranchName?: string;
    branchName: string;
    data?: WorktreeActivityResult;
    error?: string;
    isLoading: boolean;
    projectId: string;
    pullRequestNumber?: number;
};

export function WorktreeActivity({
    baseBranchName,
    branchName,
    data,
    error,
    isLoading,
    projectId,
    pullRequestNumber,
}: WorktreeActivityProps) {
    if (isLoading) {
        return <ActivitySkeleton />;
    }

    if (error) {
        return (
            <Surface className="px-3 py-2 text-sm" variant="danger">
                {error}
            </Surface>
        );
    }

    if (!data || (data.baseCommits.length === 0 && data.items.length === 0)) {
        return (
            <Surface className="min-h-48" variant="muted">
                <EmptyState
                    description="This branch does not have commits or review activity to show yet."
                    icon={<GitCommitHorizontal className="size-4" />}
                    title="No activity found"
                />
            </Surface>
        );
    }

    return (
        <Surface className="overflow-hidden">
            {data.baseCommits.length > 0 ? (
                <section>
                    <TimelineDivider label="Commits from the base history" />
                    <div className="divide-border/60 divide-y">
                        {data.baseCommits.map((commit) => (
                            <CommitRow
                                commit={commit}
                                key={commit.hash}
                                muted
                            />
                        ))}
                    </div>
                </section>
            ) : null}

            <section>
                <TimelineDivider label="Activity on this branch" />
                {data.integration.status === "unavailable" &&
                data.integration.reason !== "not-a-pull-request" ? (
                    <div
                        className="border-warning/25 bg-warning/8
                            text-warning-foreground border-b px-3 py-2 text-xs"
                    >
                        {data.integration.message} Local commit history is still
                        available.
                    </div>
                ) : null}
                <div className="divide-border/60 divide-y">
                    {data.items.map((item) => (
                        <ActivityItem item={item} key={item.id} />
                    ))}
                </div>
            </section>

            {pullRequestNumber && data.integration.status === "available" ? (
                <ReviewComposer
                    baseBranchName={baseBranchName}
                    branchName={branchName}
                    pendingReview={data.pendingReview}
                    projectId={projectId}
                    pullRequestNumber={pullRequestNumber}
                />
            ) : null}
        </Surface>
    );
}

function TimelineDivider({ label }: { label: string }) {
    return (
        <div
            className="bg-muted/15 text-muted-foreground flex items-center gap-3
                border-y px-3 py-2 text-[11px] font-semibold tracking-wide"
        >
            <span className="bg-border h-px flex-1" />
            <span>{label}</span>
            <span className="bg-border h-px flex-1" />
        </div>
    );
}

function ActivitySkeleton() {
    return (
        <Surface className="overflow-hidden">
            {Array.from({ length: 7 }).map((_, index) => (
                <div
                    className="border-border/60 grid grid-cols-[2rem_1fr_auto]
                        gap-3 border-b px-3 py-3 last:border-b-0"
                    key={index}
                >
                    <Skeleton className="size-8 rounded-lg" />
                    <div className="grid gap-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-10/12" />
                        <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                </div>
            ))}
        </Surface>
    );
}
