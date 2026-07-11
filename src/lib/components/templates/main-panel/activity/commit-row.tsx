import { Binary } from "lucide-react";

import { ActivityAvatar } from "@/lib/components/templates/main-panel/activity/activity-avatar";
import type { ActivitySide } from "@/lib/components/templates/main-panel/activity/activity-side";
import { ActivityTime } from "@/lib/components/templates/main-panel/activity/activity-time";
import { cn } from "@/lib/utils/cn";
import type { CommitInfo } from "@/types/pr-run";

type CommitRowProps = {
    commit: CommitInfo;
    compact?: boolean;
    muted?: boolean;
    side?: ActivitySide;
};

export function CommitRow({
    commit,
    compact = false,
    muted = false,
    side = "neutral",
}: CommitRowProps) {
    const authorName = commit.authorLogin ?? commit.authorName;
    const hashContent = (
        <span className="font-mono text-[11px] tracking-tight">
            {commit.shortHash}
        </span>
    );
    const contentAlignment = compact
        ? "items-stretch"
        : side === "right"
          ? "items-end"
          : "items-start";

    return (
        <article
            className={cn(
                `group flex min-w-0 flex-col px-2.5 py-2 text-left
                transition-colors`,
                compact
                    ? "hover:bg-muted/15 w-full rounded-none py-2.5"
                    : `border-border/70 bg-surface/80 hover:bg-surface w-fit
                        max-w-[min(64%,42rem)] overflow-hidden rounded-lg border
                        max-[800px]:max-w-[85%] max-[600px]:max-w-full`,
                muted && "opacity-60 hover:opacity-85",
                contentAlignment,
            )}
        >
            <header
                className={cn(
                    "flex w-fit max-w-full min-w-0 items-center gap-2",
                    side === "right" && "flex-row-reverse",
                )}
            >
                <ActivityAvatar
                    imageUrl={commit.authorAvatarUrl}
                    name={authorName}
                />
                <div
                    className={cn(
                        "flex min-w-0 flex-col gap-0",
                        side === "right" && "items-end text-right",
                    )}
                >
                    {commit.authorUrl ? (
                        <a
                            className="max-w-full truncate text-sm leading-4
                                font-semibold hover:underline"
                            href={commit.authorUrl}
                            rel="noreferrer"
                            target="_blank"
                        >
                            {authorName}
                        </a>
                    ) : (
                        <span
                            className="truncate text-sm leading-4 font-semibold"
                        >
                            {authorName}
                        </span>
                    )}
                    <div
                        className={cn(
                            `text-muted-foreground flex flex-nowrap items-center
                            gap-x-1.5 text-[11px] leading-3.5 whitespace-nowrap`,
                            side === "right" && "justify-end",
                        )}
                    >
                        <span>committed</span>
                        <span aria-hidden="true">·</span>
                        <ActivityTime
                            className="shrink-0 whitespace-nowrap tabular-nums"
                            value={commit.date}
                        />
                    </div>
                </div>
            </header>
            <div
                className="text-foreground mt-2 w-fit max-w-[60ch] text-sm
                    leading-5 font-medium [overflow-wrap:anywhere] break-words"
            >
                {commit.subject}
            </div>
            <div
                className={cn(
                    `text-muted-foreground mt-1.5 flex w-fit max-w-full
                    flex-wrap items-center gap-2 text-xs`,
                    side === "right" && "justify-end",
                )}
            >
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
