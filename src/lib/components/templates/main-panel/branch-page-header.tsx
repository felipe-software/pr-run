import { FolderPlus, Globe, RefreshCw } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { StatusPill } from "@/lib/components/atoms/status-pill";
import { Surface } from "@/lib/components/atoms/surface";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

type BranchPageHeaderProps = {
    actionError?: string;
    branch: BranchInfo;
    isCheckingOutWorktree: boolean;
    isRefreshingCommits: boolean;
    project: ProjectConfig;
    onCheckoutBranch: (projectId: string, branchName: string) => Promise<void>;
    onReloadCommits: () => void;
};

export function BranchPageHeader({
    actionError,
    branch,
    isCheckingOutWorktree,
    isRefreshingCommits,
    project,
    onCheckoutBranch,
    onReloadCommits,
}: BranchPageHeaderProps) {
    const baseBranchName = branch.compareBranchName ?? "default branch";

    return (
        <header>
            <Surface className="rounded-t-none px-3 py-2.5">
                <div
                    className="flex flex-col gap-3 lg:flex-row lg:items-center
                        lg:justify-between"
                >
                    <div className="min-w-0">
                        <h1
                            className="text-foreground truncate font-mono
                                text-lg leading-6 font-semibold tracking-tight"
                        >
                            {branch.name}
                        </h1>
                        <div
                            className="text-muted-foreground mt-2 flex flex-wrap
                                items-center gap-1.5 text-xs"
                        >
                            <StatusPill
                                tone={
                                    branch.source === "pull-request"
                                        ? "pull-request"
                                        : "branch"
                                }
                            >
                                {branch.source === "pull-request"
                                    ? "PR"
                                    : "Branch"}
                            </StatusPill>
                            <StatusPill
                                tone={branch.hasWorktree ? "worktree" : "idle"}
                            >
                                {branch.hasWorktree
                                    ? "Worktree ready"
                                    : "No worktree"}
                            </StatusPill>
                            <span className="font-mono text-[11px]">
                                base: {baseBranchName}
                            </span>
                            {branch.pullRequest ? (
                                <a
                                    className="text-foreground
                                        hover:text-primary inline-flex
                                        items-center gap-1 transition
                                        hover:underline"
                                    href={branch.pullRequest.url}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    PR #{branch.pullRequest.number}
                                </a>
                            ) : null}
                            {branch.repository ? (
                                <a
                                    className="text-foreground
                                        hover:text-primary inline-flex min-w-0
                                        items-center gap-1 transition
                                        hover:underline"
                                    href={branch.repository.url}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    <Globe className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">
                                        {branch.repository.nameWithOwner}
                                    </span>
                                </a>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        {branch.hasWorktree ? null : (
                            <Button
                                isDisabled={isCheckingOutWorktree}
                                size="sm"
                                variant="primary"
                                type="button"
                                onPress={() =>
                                    void onCheckoutBranch(
                                        project.id,
                                        branch.name,
                                    )
                                }
                            >
                                {isCheckingOutWorktree ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FolderPlus className="h-4 w-4" />
                                )}
                                Create worktree
                            </Button>
                        )}
                        <Button
                            aria-label="Reload commits"
                            isDisabled={isRefreshingCommits}
                            isIconOnly
                            size="icon-sm"
                            type="button"
                            variant="outline"
                            onPress={onReloadCommits}
                        >
                            <RefreshCw
                                className={[
                                    "h-4 w-4",
                                    isRefreshingCommits ? "animate-spin" : "",
                                ].join(" ")}
                            />
                        </Button>
                    </div>
                </div>

                {actionError ? (
                    <Surface
                        className="mt-3 px-3 py-2 text-sm"
                        variant="danger"
                    >
                        {actionError}
                    </Surface>
                ) : null}
            </Surface>
        </header>
    );
}
