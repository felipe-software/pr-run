import { Check, CircleDot, MessageSquareText, X } from "lucide-react";

import { MarkdownRenderer } from "@/lib/components/molecules/markdown/markdown-renderer";
import { ActivityAvatar } from "@/lib/components/templates/main-panel/activity/activity-avatar";
import type { ActivitySide } from "@/lib/components/templates/main-panel/activity/activity-side";
import { ActivityTime } from "@/lib/components/templates/main-panel/activity/activity-time";
import { CommitRow } from "@/lib/components/templates/main-panel/activity/commit-row";
import { resolveGitHubMarkdownUrl } from "@/lib/components/templates/main-panel/activity/github-markdown-url";
import { ReviewCommentCard } from "@/lib/components/templates/main-panel/activity/review-comment-card";
import { cn } from "@/lib/utils/cn";
import type {
    PullRequestReviewState,
    WorktreeActivityItem as WorktreeActivityItemType,
} from "@/types/pr-run";

type ActivityItemProps = {
    branchName: string;
    item: WorktreeActivityItemType;
    repositoryUrl?: string;
    side: ActivitySide;
};

export function ActivityItem({
    branchName,
    item,
    repositoryUrl,
    side,
}: ActivityItemProps) {
    if (item.type === "commit") {
        return <CommitRow commit={item.commit} side={side} />;
    }

    const content = item.type === "comment" ? item.comment : item.review;
    const action =
        item.type === "comment" ? "commented" : reviewAction(item.review.state);
    const date =
        item.type === "comment"
            ? item.comment.createdAt
            : item.review.submittedAt;
    const icon =
        item.type === "comment" ? (
            <MessageSquareText className="size-3.5" />
        ) : (
            reviewIcon(item.review.state)
        );

    return (
        <article
            className={cn(
                `border-border/70 bg-surface/80 hover:bg-surface flex w-fit
                max-w-[min(64%,42rem)] min-w-0 flex-col overflow-hidden
                rounded-lg border px-2.5 py-2 text-left transition-colors
                max-[800px]:max-w-[85%] max-[600px]:max-w-full`,
                side === "right" ? "items-end" : "items-start",
            )}
        >
            <header
                className={cn(
                    "flex w-fit max-w-full min-w-0 items-start gap-2",
                    side === "right" && "flex-row-reverse",
                )}
            >
                <ActivityAvatar
                    imageUrl={content.author.avatarUrl}
                    name={content.author.login}
                />
                <div
                    className={cn(
                        "flex min-w-0 flex-col gap-px",
                        side === "right" && "items-end text-right",
                    )}
                >
                    <a
                        className="max-w-full truncate text-sm leading-4
                            font-semibold hover:underline"
                        href={content.author.url}
                        rel="noreferrer"
                        target="_blank"
                    >
                        {content.author.login}
                    </a>
                    <span
                        className={cn(
                            `text-muted-foreground inline-flex items-center
                            gap-1 text-[11px] leading-3.5 whitespace-nowrap`,
                            side === "right" && "justify-end",
                        )}
                    >
                        {icon}
                        {action}
                    </span>
                    <ActivityTime
                        className="text-muted-foreground shrink-0 text-[10px]
                            leading-3 whitespace-nowrap tabular-nums"
                        value={date}
                    />
                </div>
            </header>
            {content.body ? (
                <MarkdownRenderer
                    className="mt-2 w-fit max-w-[60ch] leading-5
                        [overflow-wrap:anywhere] break-words [&_img]:my-2
                        [&_p]:my-1.5"
                    markdown={content.body}
                    mediaAlignment={side === "right" ? "right" : "left"}
                    urlTransform={(url) =>
                        resolveGitHubMarkdownUrl(url, repositoryUrl, branchName)
                    }
                />
            ) : null}
            {item.type === "review" && item.review.comments.length > 0 ? (
                <div
                    className="mt-2 flex w-full min-w-0 flex-col gap-1.5
                        self-stretch"
                >
                    {item.review.comments.map((comment) => (
                        <ReviewCommentCard
                            branchName={branchName}
                            comment={comment}
                            key={comment.id}
                            mediaAlignment={side === "right" ? "right" : "left"}
                            repositoryUrl={repositoryUrl}
                        />
                    ))}
                </div>
            ) : null}
        </article>
    );
}

function reviewAction(state: PullRequestReviewState) {
    if (state === "APPROVED") {
        return "approved these changes";
    }

    if (state === "CHANGES_REQUESTED") {
        return "requested changes";
    }

    if (state === "DISMISSED") {
        return "had a review dismissed";
    }

    return "reviewed these changes";
}

function reviewIcon(state: PullRequestReviewState) {
    if (state === "APPROVED") {
        return <Check className="text-success size-3.5" />;
    }

    if (state === "CHANGES_REQUESTED") {
        return <X className="text-danger size-3.5" />;
    }

    return <CircleDot className="size-3.5" />;
}
