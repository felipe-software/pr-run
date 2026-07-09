import { ExternalLink, FileDiff } from "lucide-react";

import type { OverviewPullRequestChange } from "@/types/overview";

type OverviewPrListProps = {
    pullRequests: OverviewPullRequestChange[];
};

export function OverviewPrList({ pullRequests }: OverviewPrListProps) {
    return (
        <section className="bg-surface rounded-lg border">
            <header
                className="flex items-center justify-between border-b px-4 py-3"
            >
                <div>
                    <h2 className="text-sm font-semibold tracking-tight">
                        Most changed pull requests
                    </h2>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                        Ranked by current additions and deletions
                    </p>
                </div>
                <FileDiff className="text-muted-foreground size-4" />
            </header>
            {pullRequests.length > 0 ? (
                <div className="divide-y">
                    {pullRequests.slice(0, 8).map((pullRequest) => (
                        <a
                            className="hover:bg-muted/35 focus-visible:ring-ring
                                flex items-center gap-3 px-4 py-3
                                transition-colors outline-none
                                focus-visible:ring-2"
                            href={pullRequest.url}
                            key={`${pullRequest.projectId}:${pullRequest.number}`}
                            rel="noreferrer"
                            target="_blank"
                        >
                            <span
                                className="bg-muted text-muted-foreground grid
                                    size-7 shrink-0 place-items-center
                                    rounded-md font-mono text-[10px]"
                            >
                                #{pullRequest.number}
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
                                        block truncate font-mono text-[10px]"
                                >
                                    {pullRequest.projectName} /{" "}
                                    {pullRequest.branchName}
                                </span>
                            </span>
                            <span
                                className="hidden shrink-0 text-right font-mono
                                    text-[10px] tabular-nums sm:block"
                            >
                                <span className="text-success">
                                    +{pullRequest.additions.toLocaleString()}
                                </span>
                                <span className="text-destructive ml-1.5">
                                    -{pullRequest.deletions.toLocaleString()}
                                </span>
                            </span>
                            <ExternalLink
                                className="text-muted-foreground/60 size-3.5
                                    shrink-0"
                            />
                        </a>
                    ))}
                </div>
            ) : (
                <p
                    className="text-muted-foreground px-4 py-10 text-center
                        text-sm"
                >
                    No open pull requests found for this scope.
                </p>
            )}
        </section>
    );
}
