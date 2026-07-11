import { Check, CircleDot, MessageSquareText, X } from "lucide-react";

import { MarkdownRenderer } from "@/lib/components/molecules/markdown/markdown-renderer";
import { ActivityAvatar } from "@/lib/components/templates/main-panel/activity/activity-avatar";
import { CommitRow } from "@/lib/components/templates/main-panel/activity/commit-row";
import { resolveGitHubMarkdownUrl } from "@/lib/components/templates/main-panel/activity/github-markdown-url";
import { ReviewCommentCard } from "@/lib/components/templates/main-panel/activity/review-comment-card";
import { formatDate } from "@/lib/format";
import type {
    PullRequestReviewState,
    WorktreeActivityItem as WorktreeActivityItemType,
} from "@/types/pr-run";

type ActivityItemProps = {
    branchName: string;
    item: WorktreeActivityItemType;
    repositoryUrl?: string;
};

export function ActivityItem({
    branchName,
    item,
    repositoryUrl,
}: ActivityItemProps) {
    if (item.type === "commit") {
        return <CommitRow commit={item.commit} />;
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
        <article className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-3 py-3">
            <ActivityAvatar
                imageUrl={content.author.avatarUrl}
                name={content.author.login}
            />
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <a
                        className="text-sm font-semibold hover:underline"
                        href={content.author.url}
                        rel="noreferrer"
                        target="_blank"
                    >
                        {content.author.login}
                    </a>
                    <span
                        className="text-muted-foreground inline-flex
                            items-center gap-1 text-xs"
                    >
                        {icon}
                        {action}
                    </span>
                    <time
                        className="text-muted-foreground text-xs"
                        dateTime={date}
                    >
                        · {formatDate(date)}
                    </time>
                </div>
                {content.body ? (
                    <MarkdownRenderer
                        className="mt-2 max-w-[70ch]"
                        markdown={content.body}
                        urlTransform={(url) =>
                            resolveGitHubMarkdownUrl(
                                url,
                                repositoryUrl,
                                branchName,
                            )
                        }
                    />
                ) : null}
                {item.type === "review" && item.review.comments.length > 0 ? (
                    <div className="mt-3 flex flex-col gap-2">
                        {item.review.comments.map((comment) => (
                            <ReviewCommentCard
                                branchName={branchName}
                                comment={comment}
                                key={comment.id}
                                repositoryUrl={repositoryUrl}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
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
