import { Card, Surface } from "@heroui/react";
import { FolderPlus, Globe, RefreshCw } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { Chip } from "@/lib/components/atoms/chip";
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
            <Card className="rounded-lg border border-border bg-surface">
                <Card.Content className="px-5 py-1">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <Card.Title className="break-words text-2xl">
                                {branch.name}
                            </Card.Title>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Chip>
                                    {branch.source === "pull-request"
                                        ? "PR"
                                        : "Branch"}
                                </Chip>
                                <Chip>Base: {baseBranchName}</Chip>
                                {branch.hasWorktree ? (
                                    <Chip tone="success">Worktree ready</Chip>
                                ) : (
                                    <Chip>No worktree</Chip>
                                )}
                                {branch.pullRequest ? (
                                    <a
                                        className="inline-flex items-center gap-1 text-foreground transition hover:text-primary hover:underline"
                                        href={branch.pullRequest.url}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        PR #{branch.pullRequest.number}
                                    </a>
                                ) : null}
                                {branch.repository ? (
                                    <a
                                        className="inline-flex items-center gap-1 text-foreground transition hover:text-primary hover:underline"
                                        href={branch.repository.url}
                                        rel="noreferrer"
                                        target="_blank"
                                    >
                                        <Globe className="h-3.5 w-3.5" />
                                        {branch.repository.nameWithOwner}
                                    </a>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            {branch.hasWorktree ? null : (
                                <Button
                                    isDisabled={isCheckingOutWorktree}
                                    tone="primary"
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
                                className="h-9 w-9 min-w-9 px-0"
                                isDisabled={isRefreshingCommits}
                                isIconOnly
                                type="button"
                                onPress={onReloadCommits}
                            >
                                <RefreshCw
                                    className={[
                                        "h-4 w-4",
                                        isRefreshingCommits
                                            ? "animate-spin"
                                            : "",
                                    ].join(" ")}
                                />
                            </Button>
                        </div>
                    </div>

                    {actionError ? (
                        <Surface className="mt-4 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
                            {actionError}
                        </Surface>
                    ) : null}
                </Card.Content>
            </Card>
        </header>
    );
}
