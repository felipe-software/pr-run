import { Check, CircleDot, MessageSquareText, X } from "lucide-react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { ActivityAvatar } from "@/lib/components/templates/main-panel/activity/activity-avatar";
import { CommitRow } from "@/lib/components/templates/main-panel/activity/commit-row";
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
                    <MarkdownBody
                        body={content.body}
                        branchName={branchName}
                        repositoryUrl={repositoryUrl}
                    />
                ) : null}
                {item.type === "review" && item.review.comments.length > 0 ? (
                    <div
                        className="border-border/70 mt-2 grid gap-2 border-l
                            pl-3"
                    >
                        {item.review.comments.map((comment) => (
                            <a
                                className="group text-xs"
                                href={comment.url}
                                key={comment.id}
                                rel="noreferrer"
                                target="_blank"
                            >
                                <span
                                    className="text-muted-foreground font-mono"
                                >
                                    {comment.path}:
                                    {comment.isOutdated
                                        ? "outdated"
                                        : comment.subjectType === "file"
                                          ? "file"
                                          : comment.line}
                                </span>
                                <span
                                    className="text-foreground mt-0.5 block
                                        whitespace-pre-wrap
                                        group-hover:underline"
                                >
                                    {comment.body}
                                </span>
                            </a>
                        ))}
                    </div>
                ) : null}
            </div>
        </article>
    );
}

function MarkdownBody({
    body,
    branchName,
    repositoryUrl,
}: {
    body: string;
    branchName: string;
    repositoryUrl?: string;
}) {
    return (
        <div
            className="text-foreground/90 [&_a]:text-primary [&_code]:bg-muted
                [&_pre]:bg-muted mt-2 max-w-[70ch] text-sm leading-6
                [&_a]:underline [&_code]:rounded [&_code]:px-1 [&_img]:my-2
                [&_img]:max-h-72 [&_img]:max-w-full [&_img]:rounded-md
                [&_img]:object-contain [&_p]:my-1.5 [&_pre]:my-2
                [&_pre]:overflow-auto [&_pre]:rounded-md [&_pre]:p-2"
        >
            <ReactMarkdown
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                remarkPlugins={[remarkGfm]}
                urlTransform={(url) =>
                    resolveGitHubMarkdownUrl(url, repositoryUrl, branchName)
                }
            >
                {body}
            </ReactMarkdown>
        </div>
    );
}

export function resolveGitHubMarkdownUrl(
    url: string,
    repositoryUrl: string | undefined,
    branchName: string,
) {
    const safeUrl = defaultUrlTransform(url);

    if (
        !safeUrl ||
        !repositoryUrl ||
        safeUrl.startsWith("#") ||
        safeUrl.startsWith("//") ||
        /^[a-z][a-z\d+.-]*:/i.test(safeUrl)
    ) {
        return safeUrl;
    }

    const repository = repositoryUrl.replace(/\/$/, "");

    if (safeUrl.startsWith("../blob/")) {
        return `${repository}/${safeUrl.replace(/^\.\.\//, "")}`;
    }

    const encodedBranch = branchName
        .split("/")
        .map(encodeURIComponent)
        .join("/");
    const relativePath = safeUrl.startsWith("/")
        ? safeUrl.slice(1)
        : safeUrl.replace(/^\.\//, "");

    return `${repository}/blob/${encodedBranch}/${relativePath}`;
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
