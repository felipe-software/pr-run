import {
    Check,
    GitCommitHorizontal,
    GitPullRequest,
    MessageSquareText,
    X,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState } from "react";

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
    projectId: string;
    repositoryUrl?: string;
};

export function ActivityTimeline({
    baseBranchName,
    baseCommits,
    branchName,
    items,
    pullRequestAuthorLogin,
    projectId,
    repositoryUrl,
}: ActivityTimelineProps) {
    return (
        <section aria-label="Branch activity">
            <TimelineFrame>
                <BaseHistory
                    baseBranchName={baseBranchName}
                    commits={baseCommits}
                    key={branchName}
                    projectId={projectId}
                />
                <VirtualActivityList
                    branchName={branchName}
                    items={items}
                    pullRequestAuthorLogin={pullRequestAuthorLogin}
                    projectId={projectId}
                    repositoryUrl={repositoryUrl}
                />
            </TimelineFrame>
        </section>
    );
}

function VirtualActivityList({
    branchName,
    items,
    pullRequestAuthorLogin,
    projectId,
    repositoryUrl,
}: {
    branchName: string;
    items: WorktreeActivityItem[];
    pullRequestAuthorLogin?: string;
    projectId: string;
    repositoryUrl?: string;
}) {
    const listRef = useRef<HTMLDivElement>(null);
    const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
        null,
    );
    const [scrollMargin, setScrollMargin] = useState(0);
    const virtualizer = useVirtualizer({
        count: items.length,
        estimateSize: (index) => estimateActivityHeight(items[index]),
        getItemKey: (index) => items[index]?.id ?? index,
        getScrollElement: () => scrollElement,
        overscan: 4,
        scrollMargin,
        useAnimationFrameWithResizeObserver: true,
    });
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (
        item,
        _delta,
        instance,
    ) => !instance.isScrolling && item.end < (instance.scrollOffset ?? 0);

    useLayoutEffect(() => {
        const list = listRef.current;
        const viewport = list?.closest<HTMLDivElement>(
            "[data-activity-viewport]",
        );

        if (!list || !viewport) {
            return;
        }

        setScrollElement(viewport);

        function updateScrollMargin() {
            const listBounds = list!.getBoundingClientRect();
            const viewportBounds = viewport!.getBoundingClientRect();
            setScrollMargin(
                listBounds.top - viewportBounds.top + viewport!.scrollTop,
            );
        }

        const resizeObserver = new ResizeObserver(updateScrollMargin);
        resizeObserver.observe(viewport.firstElementChild ?? viewport);
        updateScrollMargin();

        return () => resizeObserver.disconnect();
    }, []);

    return (
        <div
            className="relative w-full"
            ref={listRef}
            role="list"
            style={{ height: virtualizer.getTotalSize() }}
        >
            {virtualizer.getVirtualItems().map((virtualRow) => {
                const item = items[virtualRow.index];

                if (!item) {
                    return null;
                }

                const side = resolveActivitySide(item, pullRequestAuthorLogin);

                return (
                    <div
                        className="absolute top-0 left-0 w-full pb-5"
                        data-index={virtualRow.index}
                        key={item.id}
                        ref={virtualizer.measureElement}
                        role="listitem"
                        style={{
                            transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                        }}
                    >
                        <TimelineItem marker={activityMarker(item)} side={side}>
                            <ActivityItem
                                branchName={branchName}
                                item={item}
                                projectId={projectId}
                                repositoryUrl={repositoryUrl}
                                side={side}
                            />
                        </TimelineItem>
                    </div>
                );
            })}
        </div>
    );
}

function estimateActivityHeight(item: WorktreeActivityItem | undefined) {
    if (!item || item.type === "commit") {
        return 112;
    }

    if (item.type === "comment") {
        return item.comment.body ? 180 : 112;
    }

    return 156 + item.review.comments.length * 180;
}

function activityMarker(item: WorktreeActivityItem) {
    if (item.type === "commit") {
        return <GitCommitHorizontal className="text-foreground size-3.5" />;
    }

    if (item.type === "comment") {
        return <MessageSquareText className="text-muted-foreground size-3.5" />;
    }

    if (item.review.state === "CHANGES_REQUESTED") {
        return <X className="text-danger size-4" />;
    }

    if (item.review.state === "APPROVED") {
        return <Check className="text-success size-4" />;
    }

    return <GitPullRequest className="text-muted-foreground size-3.5" />;
}
