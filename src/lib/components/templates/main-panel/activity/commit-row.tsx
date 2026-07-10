import { Binary } from "lucide-react";

import { ActivityAvatar } from "@/lib/components/templates/main-panel/activity/activity-avatar";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import type { CommitInfo } from "@/types/pr-run";

type CommitRowProps = {
    commit: CommitInfo;
    muted?: boolean;
};

export function CommitRow({ commit, muted = false }: CommitRowProps) {
    const authorName = commit.authorLogin ?? commit.authorName;
    const hashContent = (
        <span className="font-mono text-[11px] tracking-tight">
            {commit.shortHash}
        </span>
    );

    return (
        <article
            className={cn(
                `group hover:bg-muted/15 grid
                grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-3 px-3 py-3
                transition-colors`,
                muted && "opacity-60 hover:opacity-85",
            )}
        >
            <ActivityAvatar
                imageUrl={commit.authorAvatarUrl}
                name={authorName}
            />
            <div className="min-w-0">
                <div className="flex min-w-0 items-baseline gap-1.5">
                    {commit.authorUrl ? (
                        <a
                            className="truncate text-sm font-semibold
                                hover:underline"
                            href={commit.authorUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            {authorName}
                        </a>
                    ) : (
                        <span className="truncate text-sm font-semibold">
                            {authorName}
                        </span>
                    )}
                    <span className="text-muted-foreground shrink-0 text-xs">
                        committed
                    </span>
                </div>
                <div
                    className="text-foreground mt-0.5 text-sm leading-5
                        font-medium"
                >
                    {commit.subject}
                </div>
                <div
                    className="text-muted-foreground mt-1.5 flex flex-wrap
                        items-center gap-2 text-xs"
                >
                    <time dateTime={commit.date}>
                        {formatDate(commit.date)}
                    </time>
                    {commit.additions !== undefined ? (
                        <span className="font-mono tabular-nums">
                            <span className="text-success">
                                +{commit.additions}
                            </span>{" "}
                            <span className="text-danger">
                                −{commit.deletions ?? 0}
                            </span>
                        </span>
                    ) : null}
                    {commit.hasBinaryChanges ? (
                        <span className="inline-flex items-center gap-1">
                            <Binary className="size-3" />
                            Binary files changed
                        </span>
                    ) : null}
                </div>
            </div>
            <div className="text-muted-foreground pt-0.5">
                {commit.url ? (
                    <a
                        aria-label={`Open commit ${commit.shortHash}`}
                        className="hover:text-foreground transition-colors
                            hover:underline"
                        href={commit.url}
                        rel="noreferrer"
                        target="_blank"
                    >
                        {hashContent}
                    </a>
                ) : (
                    hashContent
                )}
            </div>
        </article>
    );
}
