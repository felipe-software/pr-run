import { GitCommitHorizontal } from "lucide-react";

import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { ActivityTimeline } from "@/lib/components/templates/main-panel/activity/activity-timeline";
import { ReviewComposer } from "@/lib/components/templates/main-panel/activity/review-composer";
import { TimelineFrame } from "@/lib/components/templates/main-panel/activity/timeline-frame";
import { TimelineItem } from "@/lib/components/templates/main-panel/activity/timeline-item";
import { cn } from "@/lib/utils/cn";
import type { WorktreeActivityResult } from "@/types/pr-run";

type WorktreeActivityProps = {
    baseBranchName?: string;
    branchName: string;
    data?: WorktreeActivityResult;
    error?: string;
    isLoading: boolean;
    projectId: string;
    pullRequestAuthorLogin?: string;
    pullRequestNumber?: number;
    repositoryUrl?: string;
};

export function WorktreeActivity({
    baseBranchName,
    branchName,
    data,
    error,
    isLoading,
    projectId,
    pullRequestAuthorLogin,
    pullRequestNumber,
    repositoryUrl,
}: WorktreeActivityProps) {
    if (isLoading) {
        return (
            <ActivitySkeleton
                hasConversationSides={Boolean(pullRequestAuthorLogin?.trim())}
            />
        );
    }

    if (error) {
        return (
            <Surface className="px-3 py-2 text-sm" variant="danger">
                {error}
            </Surface>
        );
    }

    if (
        !data ||
        (data.baseCommits.length === 0 &&
            data.items.length === 0 &&
            !data.pendingReview)
    ) {
        return (
            <div className="min-h-48">
                <EmptyState
                    description="This branch does not have commits or review activity to show yet."
                    icon={<GitCommitHorizontal className="size-4" />}
                    title="No activity found"
                />
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-5xl">
            {data.integration.status === "unavailable" &&
            data.integration.reason !== "not-a-pull-request" ? (
                <div
                    className="border-warning/25 bg-warning/8
                        text-warning-foreground mx-3 mt-3 rounded-md border px-3
                        py-2 text-xs"
                >
                    {data.integration.message} Local commit history is still
                    available.
                </div>
            ) : null}

            <ActivityTimeline
                baseBranchName={baseBranchName}
                baseCommits={data.baseCommits}
                branchName={branchName}
                items={data.items}
                pullRequestAuthorLogin={pullRequestAuthorLogin}
                repositoryUrl={repositoryUrl}
            />

            {pullRequestNumber && data.integration.status === "available" ? (
                <ReviewComposer
                    key={`${projectId}:${pullRequestNumber}`}
                    baseBranchName={baseBranchName}
                    branchName={branchName}
                    pendingReview={data.pendingReview}
                    projectId={projectId}
                    pullRequestNumber={pullRequestNumber}
                />
            ) : null}
        </div>
    );
}

function ActivitySkeleton({
    hasConversationSides,
}: {
    hasConversationSides: boolean;
}) {
    return (
        <TimelineFrame className="mx-auto w-full max-w-5xl">
            <div className="flex flex-col gap-5">
                {Array.from({ length: 7 }).map((_, index) => {
                    const isRight = hasConversationSides && index % 2 === 0;
                    const side = hasConversationSides
                        ? isRight
                            ? "right"
                            : "left"
                        : "neutral";

                    return (
                        <TimelineItem
                            key={index}
                            marker={
                                <Skeleton className="size-3.5 rounded-sm" />
                            }
                            side={side}
                        >
                            <div
                                className={cn(
                                    `border-border/70 bg-surface/80 flex w-80
                                    max-w-full min-w-0 gap-3 rounded-lg border
                                    px-3 py-2`,
                                    isRight && "flex-row-reverse",
                                )}
                            >
                                <Skeleton className="size-8 shrink-0" />
                                <div
                                    className="flex min-w-0 flex-1 flex-col
                                        gap-2"
                                >
                                    <Skeleton
                                        className={cn(
                                            "h-4 w-32 max-w-full",
                                            isRight && "ml-auto",
                                        )}
                                    />
                                    <Skeleton className="h-4 w-10/12" />
                                    <Skeleton
                                        className={cn(
                                            "h-3 w-48 max-w-full",
                                            isRight && "ml-auto",
                                        )}
                                    />
                                </div>
                            </div>
                        </TimelineItem>
                    );
                })}
            </div>
        </TimelineFrame>
    );
}
