import { ExternalLink, GitMerge, GitPullRequestClosed } from "lucide-react";

import { StatusPill } from "@/lib/components/atoms/status-pill";
import { formatDate } from "@/lib/format";
import { useUiPreferencesStore } from "@/lib/hooks/store/use-ui-preferences-store";
import type { OverviewPullRequestChange } from "@/types/overview";

export function OverviewRecentPrList({
    pullRequests,
}: {
    pullRequests: OverviewPullRequestChange[];
}) {
    const dateFormat = useUiPreferencesStore((store) => store.dateFormat);

    return (
        <section className="bg-surface overflow-hidden rounded-lg border">
            <header
                className="flex items-center justify-between border-b px-4 py-3"
            >
                <div>
                    <h2 className="text-sm font-semibold tracking-tight">
                        Recent pull requests
                    </h2>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                        Recently merged and closed work, including deleted fork
                        branches
                    </p>
                </div>
                <GitPullRequestClosed className="text-muted-foreground size-4" />
            </header>
            {pullRequests.length > 0 ? (
                <div className="divide-y">
                    {pullRequests.map((pullRequest) => {
                        const isMerged = pullRequest.state === "MERGED";

                        return (
                            <a
                                className="hover:bg-muted/35
                                    focus-visible:ring-ring flex min-w-0
                                    items-center gap-3 px-4 py-2.5
                                    transition-colors outline-none
                                    focus-visible:ring-2"
                                href={pullRequest.url}
                                key={`${pullRequest.projectId}:${pullRequest.number}`}
                                rel="noreferrer"
                                target="_blank"
                            >
                                <span
                                    className={
                                        isMerged
                                            ? `bg-primary/10 text-primary flex
                                                size-7 shrink-0 items-center
                                                justify-center rounded-md`
                                            : `bg-muted text-muted-foreground
                                                flex size-7 shrink-0
                                                items-center justify-center
                                                rounded-md`
                                    }
                                >
                                    {isMerged ? (
                                        <GitMerge className="size-3.5" />
                                    ) : (
                                        <GitPullRequestClosed className="size-3.5" />
                                    )}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span
                                        className="block truncate text-xs
                                            font-medium"
                                    >
                                        {pullRequest.title}
                                    </span>
                                    <span
                                        className="text-muted-foreground mt-0.5
                                            block truncate font-mono
                                            text-[10px]"
                                    >
                                        {pullRequest.projectName} · #
                                        {pullRequest.number} ·{" "}
                                        {pullRequest.branchName}
                                    </span>
                                </span>
                                <StatusPill
                                    tone={isMerged ? "pull-request" : "idle"}
                                >
                                    {isMerged ? "Merged" : "Closed"}
                                </StatusPill>
                                {pullRequest.updatedAt ? (
                                    <time
                                        className="text-muted-foreground hidden
                                            shrink-0 text-[10px] tabular-nums
                                            md:block"
                                        dateTime={pullRequest.updatedAt}
                                    >
                                        {formatDate(
                                            pullRequest.updatedAt,
                                            dateFormat,
                                        )}
                                    </time>
                                ) : null}
                                <ExternalLink
                                    className="text-muted-foreground/60 size-3.5
                                        shrink-0"
                                />
                            </a>
                        );
                    })}
                </div>
            ) : (
                <p
                    className="text-muted-foreground px-4 py-8 text-center
                        text-sm"
                >
                    No recently merged or closed pull requests found.
                </p>
            )}
        </section>
    );
}
