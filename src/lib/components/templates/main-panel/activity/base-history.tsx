import { ChevronRight, GitBranch } from "lucide-react";

import { CommitRow } from "@/lib/components/templates/main-panel/activity/commit-row";
import { TimelineItem } from "@/lib/components/templates/main-panel/activity/timeline-item";
import type { CommitInfo } from "@/types/pr-run";

type BaseHistoryProps = {
    baseBranchName?: string;
    commits: CommitInfo[];
};

export function BaseHistory({ baseBranchName, commits }: BaseHistoryProps) {
    if (commits.length === 0) {
        return null;
    }

    const commitLabel = commits.length === 1 ? "commit" : "commits";

    return (
        <TimelineItem
            className="pb-3"
            connectToSpine={false}
            marker={<GitBranch className="text-muted-foreground size-3.5" />}
            markerClassName="top-1"
            side="neutral"
        >
            <details
                className="group/base-history border-border/70 bg-muted/10
                    overflow-hidden rounded-lg border"
            >
                <summary
                    className="hover:bg-muted/20 focus-visible:ring-ring flex
                        min-h-10 cursor-pointer list-none items-center gap-2
                        px-3 text-xs transition-colors outline-none
                        focus-visible:ring-2 [&::-webkit-details-marker]:hidden"
                >
                    <ChevronRight
                        className="text-muted-foreground size-3.5 shrink-0
                            transition-transform duration-200
                            group-open/base-history:rotate-90"
                    />
                    <span className="font-medium">
                        {commits.length} {commitLabel} inherited from{" "}
                        {baseBranchName ?? "the base branch"}
                    </span>
                    <span
                        className="text-muted-foreground ml-auto
                            max-[600px]:hidden"
                    >
                        Historical context
                    </span>
                </summary>
                <div
                    className="border-border/60 divide-border/50 divide-y
                        border-t"
                >
                    {commits.map((commit) => (
                        <CommitRow
                            commit={commit}
                            compact
                            key={commit.hash}
                            muted
                        />
                    ))}
                </div>
            </details>
        </TimelineItem>
    );
}
