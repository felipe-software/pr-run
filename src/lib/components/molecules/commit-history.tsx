import { GitCommitHorizontal } from "lucide-react";

import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
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
            <Surface className="overflow-hidden">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div
                        className="border-border/60 grid
                            grid-cols-[7rem_minmax(0,1fr)] gap-3 border-b px-3
                            py-3 last:border-b-0"
                        key={index}
                    >
                        <Skeleton className="h-5 w-20" />
                        <div className="grid gap-2">
                            <Skeleton className="h-4 w-10/12" />
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                ))}
            </Surface>
        );
    }

    if (error) {
        return (
            <Surface className="px-3 py-2 text-sm" variant="danger">
                {error}
            </Surface>
        );
    }

    if (commits.length === 0) {
        return (
            <Surface className="min-h-48" variant="muted">
                <EmptyState
                    description="This branch does not have commits to compare against the selected base."
                    icon={<GitCommitHorizontal className="h-4 w-4" />}
                    title="No commits found"
                />
            </Surface>
        );
    }

    const outsideBranchStartIndex = commits.findIndex(
        (commit) => !commit.isInSelectedBranch,
    );

    return (
        <Surface className="overflow-hidden">
            {commits.map((commit, index) => {
                const isOutsideBranch = !commit.isInSelectedBranch;

                return (
                    <div
                        className={index > 0 ? "border-border border-t" : ""}
                        key={commit.hash}
                    >
                        {index === outsideBranchStartIndex ? (
                            <div
                                className="bg-muted/20 text-muted-foreground
                                    flex items-center gap-3 px-3 py-2 text-xs"
                            >
                                <span
                                    className="bg-success h-2 w-2 rounded-full"
                                />
                                <span className="bg-border h-px flex-1" />
                                <span>Commits from the base history</span>
                                <span className="bg-border h-px flex-1" />
                            </div>
                        ) : null}
                        <div
                            className={[
                                "grid grid-cols-[7rem_minmax(0,1fr)] gap-3 px-3 py-3 max-[720px]:grid-cols-1",
                                isOutsideBranch ? "opacity-65" : "",
                            ].join(" ")}
                        >
                            <div
                                className="text-muted-foreground flex
                                    items-start gap-2 font-mono text-xs"
                            >
                                <span
                                    className={[
                                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                        isOutsideBranch
                                            ? "bg-muted-foreground/45"
                                            : "bg-success",
                                    ].join(" ")}
                                />
                                <GitCommitHorizontal
                                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                                />
                                {commit.url ? (
                                    <a
                                        className="hover:text-foreground
                                            hover:underline"
                                        href={commit.url}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        {commit.shortHash}
                                    </a>
                                ) : (
                                    <span>{commit.shortHash}</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                {commit.url ? (
                                    <a
                                        className="text-foreground
                                            hover:text-primary block truncate
                                            text-sm font-medium transition
                                            hover:underline"
                                        href={commit.url}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        {commit.subject}
                                    </a>
                                ) : (
                                    <div
                                        className="truncate text-sm font-medium"
                                    >
                                        {commit.subject}
                                    </div>
                                )}
                                <div
                                    className="text-muted-foreground mt-2 flex
                                        flex-wrap items-center gap-2 text-xs"
                                >
                                    {commit.authorAvatarUrl ? (
                                        <img
                                            alt={commit.authorName}
                                            className="border-border h-5 w-5
                                                rounded-md border object-cover"
                                            src={commit.authorAvatarUrl}
                                        />
                                    ) : null}
                                    {commit.authorUrl ? (
                                        <a
                                            className="hover:text-foreground
                                                hover:underline"
                                            href={commit.authorUrl}
                                            rel="noreferrer"
                                            target="_blank"
                                        >
                                            {commit.authorLogin ??
                                                commit.authorName}
                                        </a>
                                    ) : (
                                        <span>{commit.authorName}</span>
                                    )}
                                    <span>·</span>
                                    <span>{formatDate(commit.date)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </Surface>
    );
}
