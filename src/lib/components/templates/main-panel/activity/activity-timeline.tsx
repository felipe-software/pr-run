import {
    GitCommitHorizontal,
    GitPullRequest,
    MessageSquareText,
} from "lucide-react";

import { ActivityItem } from "@/lib/components/templates/main-panel/activity/activity-item";
import { resolveActivitySide } from "@/lib/components/templates/main-panel/activity/activity-side";
import { BaseHistory } from "@/lib/components/templates/main-panel/activity/base-history";
import { TimelineFrame } from "@/lib/components/templates/main-panel/activity/timeline-frame";
import { TimelineItem } from "@/lib/components/templates/main-panel/activity/timeline-item";
import type { CommitInfo, WorktreeActivityItem } from "@/types/pr-run";

type ActivityTimelineProps = {
    baseBranchName?: string;
    baseCommits: CommitInfo[];
    branchName: string;
    items: WorktreeActivityItem[];
    pullRequestAuthorLogin?: string;
    repositoryUrl?: string;
};

export function ActivityTimeline({
    baseBranchName,
    baseCommits,
    branchName,
    items,
    pullRequestAuthorLogin,
    repositoryUrl,
}: ActivityTimelineProps) {
    return (
        <section aria-label="Branch activity">
            <TimelineFrame>
                <BaseHistory
                    baseBranchName={baseBranchName}
                    commits={baseCommits}
                    key={branchName}
                />
                <div className="flex flex-col gap-5">
                    {items.map((item) => {
                        const side = resolveActivitySide(
                            item,
                            pullRequestAuthorLogin,
                        );

                        return (
                            <TimelineItem
                                key={item.id}
                                marker={activityMarker(item)}
                                side={side}
                            >
                                <ActivityItem
                                    branchName={branchName}
                                    item={item}
                                    repositoryUrl={repositoryUrl}
                                    side={side}
                                />
                            </TimelineItem>
                        );
                    })}
                </div>
            </TimelineFrame>
        </section>
    );
}

function activityMarker(item: WorktreeActivityItem) {
    if (item.type === "commit") {
        return <GitCommitHorizontal className="text-foreground size-3.5" />;
    }

    if (item.type === "comment") {
        return <MessageSquareText className="text-muted-foreground size-3.5" />;
    }

    return <GitPullRequest className="text-muted-foreground size-3.5" />;
}
