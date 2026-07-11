import { FileDiff } from "@pierre/diffs/react";

import {
    MarkdownRenderer,
    type MarkdownRendererProps,
} from "@/lib/components/molecules/markdown/markdown-renderer";
import { ActivityAvatar } from "@/lib/components/templates/main-panel/activity/activity-avatar";
import { ActivityTime } from "@/lib/components/templates/main-panel/activity/activity-time";
import { resolveGitHubMarkdownUrl } from "@/lib/components/templates/main-panel/activity/github-markdown-url";
import { parseReviewDiff } from "@/lib/components/templates/main-panel/activity/review-diff";
import type { PullRequestReviewComment } from "@/types/pr-run";

type ReviewCommentCardProps = {
    branchName: string;
    comment: PullRequestReviewComment;
    mediaAlignment?: MarkdownRendererProps["mediaAlignment"];
    repositoryUrl?: string;
};

export function ReviewCommentCard({
    branchName,
    comment,
    mediaAlignment,
    repositoryUrl,
}: ReviewCommentCardProps) {
    const fileDiff = parseReviewDiff(comment.path, comment.diffHunk);

    return (
        <div
            className="border-border/80 bg-background overflow-hidden rounded-lg
                border"
        >
            <div
                className="border-border/70 bg-muted/25 flex min-h-9
                    items-center justify-between gap-3 border-b px-3 py-1.5"
            >
                <a
                    className="min-w-0 truncate font-mono text-[11px]
                        hover:underline"
                    href={comment.url}
                    rel="noreferrer noopener"
                    target="_blank"
                    title={comment.path}
                >
                    {comment.path}
                </a>
                <div
                    className="text-muted-foreground flex shrink-0 items-center
                        gap-2 text-[10px]"
                >
                    <span className="font-mono">
                        {formatLineLabel(comment)}
                    </span>
                    {comment.isOutdated ? <span>Outdated</span> : null}
                </div>
            </div>
            {fileDiff ? (
                <div
                    className="border-border/70 max-h-72 overflow-auto border-b"
                >
                    <FileDiff
                        disableWorkerPool
                        fileDiff={fileDiff}
                        options={{
                            diffIndicators: "bars",
                            diffStyle: "unified",
                            disableFileHeader: true,
                            hunkSeparators: "line-info-basic",
                            lineDiffType: "word",
                            lineHoverHighlight: "both",
                            overflow: "scroll",
                            themeType: "system",
                        }}
                    />
                </div>
            ) : null}
            <div className="flex gap-2.5 px-3 py-2.5">
                <ActivityAvatar
                    className="size-6"
                    imageUrl={comment.author.avatarUrl}
                    name={comment.author.login}
                />
                <div className="min-w-0 flex-1">
                    <div
                        className="flex flex-wrap items-baseline gap-x-1.5
                            gap-y-0.5"
                    >
                        <a
                            className="text-xs leading-4 font-semibold
                                hover:underline"
                            href={comment.author.url}
                            rel="noreferrer noopener"
                            target="_blank"
                        >
                            {comment.author.login}
                        </a>
                        <ActivityTime
                            className="text-muted-foreground text-[10px]
                                leading-3.5"
                            value={comment.createdAt}
                        />
                    </div>
                    <MarkdownRenderer
                        className="mt-1 text-xs leading-5"
                        markdown={comment.body}
                        mediaAlignment={mediaAlignment}
                        urlTransform={(url) =>
                            resolveGitHubMarkdownUrl(
                                url,
                                repositoryUrl,
                                branchName,
                            )
                        }
                    />
                </div>
            </div>
        </div>
    );
}

function formatLineLabel(comment: PullRequestReviewComment) {
    if (comment.subjectType === "file" || comment.line === undefined) {
        return "File";
    }

    if (comment.startLine && comment.startLine !== comment.line) {
        return `L${comment.startLine}-L${comment.line}`;
    }

    return `L${comment.line}`;
}
