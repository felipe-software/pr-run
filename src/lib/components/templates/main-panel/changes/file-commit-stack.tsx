import { GitCommitHorizontal } from "lucide-react";

import { ActivityTime } from "@/lib/components/templates/main-panel/activity/activity-time";
import { cn } from "@/lib/utils/cn";
import type { FileCommitInfo } from "@/types/pr-run";

export function FileCommitStack({
    className,
    commits,
    compact = false,
}: {
    className?: string;
    commits: FileCommitInfo[];
    compact?: boolean;
}) {
    if (commits.length === 0) {
        return compact ? null : (
            <span className="text-muted-foreground text-xs">
                Commit provenance is unavailable for this file.
            </span>
        );
    }

    if (compact) {
        return (
            <span
                className={cn(
                    `text-muted-foreground inline-flex shrink-0 items-center
                    gap-1 font-mono text-[9px] tabular-nums`,
                    className,
                )}
                title={commitSummary(commits)}
            >
                <GitCommitHorizontal className="size-3" />
                {commits.length}
            </span>
        );
    }

    return (
        <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
            <span
                className="text-muted-foreground inline-flex shrink-0
                    items-center gap-1 text-[10px] font-medium"
            >
                <GitCommitHorizontal className="size-3" />
                Touched by
            </span>
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                {commits.slice(0, 3).map((commit) => (
                    <span
                        className="border-border/70 bg-muted/35 inline-flex
                            min-w-0 items-center gap-1 rounded border px-1.5
                            py-0.5 text-[10px]"
                        key={commit.hash}
                        title={`${commit.subject} — ${commit.authorName}`}
                    >
                        <span className="font-mono">{commit.shortHash}</span>
                        <span className="max-w-36 truncate">
                            {commit.subject}
                        </span>
                        <ActivityTime
                            className="text-muted-foreground hidden
                                whitespace-nowrap lg:inline"
                            value={commit.date}
                        />
                    </span>
                ))}
                {commits.length > 3 ? (
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                        +{commits.length - 3}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

function commitSummary(commits: FileCommitInfo[]) {
    return commits
        .map((commit) => `${commit.shortHash} ${commit.subject}`)
        .join("\n");
}
