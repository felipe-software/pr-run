import {
    Copy,
    ExternalLink,
    FolderPlus,
    GitBranch,
    RefreshCw,
} from "lucide-react";

import { StatusPill } from "@/lib/components/atoms/status-pill";
import { WorktreeIndicator } from "@/lib/components/atoms/worktree-indicator";
import { Alert } from "@/lib/components/ui/alert";
import { Button } from "@/lib/components/ui/button";
import { toast } from "@/lib/components/ui/toast";
import { tryPromise } from "@/lib/error";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

type BranchPageHeaderProps = {
    actionError?: string;
    branch: BranchInfo;
    isCheckingOutWorktree: boolean;
    isRefreshing: boolean;
    project: ProjectConfig;
    onCheckoutBranch: (projectId: string, branchName: string) => Promise<void>;
    onRefresh: () => Promise<unknown>;
};

export function BranchPageHeader({
    actionError,
    branch,
    isCheckingOutWorktree,
    isRefreshing,
    project,
    onCheckoutBranch,
    onRefresh,
}: BranchPageHeaderProps) {
    const baseBranchName = branch.compareBranchName ?? "default branch";
    const pullRequest = branch.pullRequest;
    const heading = pullRequest?.title ?? branch.name;

    async function copyBranchName() {
        const [error] = await tryPromise(
            navigator.clipboard.writeText(branch.name),
        );

        if (error) {
            toast.error("Could not copy the branch name.", { timeout: 2400 });
            return;
        }

        toast.success("Branch name copied.", { timeout: 1800 });
    }

    return (
        <header className="border-border/70 border-b">
            <div
                className="flex min-h-[88px] flex-col gap-3 px-4 py-3
                    lg:flex-row lg:items-start lg:justify-between"
            >
                <div className="min-w-0">
                    <div
                        className="text-muted-foreground mb-1.5 flex flex-wrap
                            items-center gap-1.5 text-xs"
                    >
                        {branch.repository ? (
                            <a
                                className="hover:text-foreground
                                    transition-colors hover:underline"
                                href={branch.repository.url}
                                rel="noreferrer"
                                target="_blank"
                            >
                                {branch.repository.nameWithOwner}
                            </a>
                        ) : (
                            <span>{project.name}</span>
                        )}
                        {pullRequest ? (
                            <>
                                <span>/</span>
                                <a
                                    className="hover:text-foreground
                                        transition-colors hover:underline"
                                    href={pullRequest.url}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    PR #{pullRequest.number}
                                </a>
                            </>
                        ) : null}
                    </div>
                    <h1
                        className="text-foreground max-w-4xl text-xl leading-6
                            font-semibold tracking-[-0.025em] text-pretty"
                    >
                        {heading}
                    </h1>
                    <div
                        className="text-muted-foreground mt-2 flex flex-wrap
                            items-center gap-1.5 text-xs"
                    >
                        {pullRequest?.author ? (
                            <a
                                className="hover:text-foreground inline-flex
                                    items-center gap-1.5 hover:underline"
                                href={pullRequest.author.url}
                                rel="noreferrer"
                                target="_blank"
                            >
                                <img
                                    alt={`${pullRequest.author.login}'s avatar`}
                                    className="size-5 rounded-md object-cover"
                                    src={pullRequest.author.avatarUrl}
                                />
                                {pullRequest.author.login}
                            </a>
                        ) : null}
                        {branch.hasWorktree ? (
                            <WorktreeIndicator variant="label" />
                        ) : (
                            <StatusPill tone="idle">No worktree</StatusPill>
                        )}
                        <span
                            className="bg-muted/45 inline-flex min-w-0
                                items-center gap-1 rounded-md px-1.5 py-0.5
                                font-mono text-[11px]"
                            title={`${branch.name} → ${baseBranchName}`}
                        >
                            <GitBranch className="size-3 shrink-0" />
                            <span className="max-w-80 truncate">
                                {branch.name}
                            </span>
                            <span aria-hidden>→</span>
                            <span className="max-w-40 truncate">
                                {baseBranchName}
                            </span>
                        </span>
                        <Button
                            aria-label="Copy branch name"
                            size="icon-xs"
                            variant="ghost"
                            onClick={copyBranchName}
                        >
                            <Copy className="size-3" />
                        </Button>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {pullRequest ? (
                        <Button
                            render={
                                <a
                                    href={pullRequest.url}
                                    rel="noreferrer"
                                    target="_blank"
                                />
                            }
                            size="sm"
                            variant="outline"
                        >
                            <ExternalLink className="size-3.5" />
                            Open on GitHub
                        </Button>
                    ) : null}
                    {branch.hasWorktree ? null : (
                        <Button
                            disabled={isCheckingOutWorktree}
                            size="sm"
                            onClick={() =>
                                onCheckoutBranch(project.id, branch.name)
                            }
                        >
                            {isCheckingOutWorktree ? (
                                <RefreshCw className="size-3.5 animate-spin" />
                            ) : (
                                <FolderPlus className="size-3.5" />
                            )}
                            Create worktree
                        </Button>
                    )}
                    <Button
                        disabled={isRefreshing}
                        size="sm"
                        variant="outline"
                        onClick={onRefresh}
                    >
                        <RefreshCw
                            className={isRefreshing ? "animate-spin" : ""}
                        />
                        Refresh
                    </Button>
                </div>
            </div>

            {actionError ? (
                <Alert className="mx-4 mb-3" variant="destructive">
                    {actionError}
                </Alert>
            ) : null}
        </header>
    );
}
