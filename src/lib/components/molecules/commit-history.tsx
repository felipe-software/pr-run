import { Card, Spinner, Surface } from "@heroui/react";
import { GitCommitHorizontal } from "lucide-react";

import { formatDate } from "@/lib/format";
import type { CommitInfo } from "@/types/pr-run";

type CommitHistoryProps = {
    commits: CommitInfo[];
    error?: string;
    isLoading: boolean;
};

export function CommitHistory({
    commits,
    error,
    isLoading,
}: CommitHistoryProps) {
    if (isLoading) {
        return (
            <Surface className="flex items-center gap-2 rounded-md text-sm text-muted-foreground">
                <Spinner size="sm" />
                Loading commits...
            </Surface>
        );
    }

    if (error) {
        return (
            <Surface className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
            </Surface>
        );
    }

    if (commits.length === 0) {
        return (
            <Surface className="rounded-md text-sm text-muted-foreground">
                No commits found.
            </Surface>
        );
    }

    const outsideBranchStartIndex = commits.findIndex(
        (commit) => !commit.isInSelectedBranch,
    );

    return (
        <Card className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {commits.map((commit, index) => {
                const isOutsideBranch = !commit.isInSelectedBranch;

                return (
                    <div key={commit.hash}>
                        {index === outsideBranchStartIndex ? (
                            <div className="flex items-center gap-3 bg-muted/10 px-4 py-2 text-xs text-muted-foreground">
                                <span className="h-2 w-2 rounded-full bg-success" />
                                <span className="h-px flex-1 bg-border" />
                                <span>Commits from the base history</span>
                                <span className="h-px flex-1 bg-border" />
                            </div>
                        ) : null}
                        <Card.Content
                            className={[
                                "grid gap-1 px-4 py-3",
                                isOutsideBranch ? "opacity-65" : "",
                            ].join(" ")}
                        >
                            <div className="flex items-start gap-3">
                                <span
                                    className={[
                                        "mt-2 h-2 w-2 shrink-0 rounded-full",
                                        isOutsideBranch
                                            ? "bg-muted-foreground/45"
                                            : "bg-success",
                                    ].join(" ")}
                                />
                                <Surface className="mt-0.5 flex shrink-0 items-center gap-1 rounded bg-muted/20 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                    <GitCommitHorizontal className="h-3 w-3" />
                                    {commit.shortHash}
                                </Surface>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">
                                        {commit.subject}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                        {commit.authorName} ·{" "}
                                        {formatDate(commit.date)}
                                    </div>
                                </div>
                            </div>
                        </Card.Content>
                    </div>
                );
            })}
        </Card>
    );
}
