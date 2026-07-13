import { Button } from "@/lib/components/ui/button";
import { getSidebarBranchPendingAction } from "@/lib/components/templates/sidebar/sidebar-branch-action";
import { SidebarBranchItem } from "@/lib/components/templates/sidebar/sidebar-branch-item";
import { SidebarProjectBranchStatus } from "@/lib/components/templates/sidebar/sidebar-project-branch-status";
import { getWorktreeOwnerKey } from "@/lib/hooks/store/use-worktree-terminal-store";
import { cn } from "@/lib/utils/cn";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

type SidebarProjectBranchesProps = {
    branchCount: number;
    branchError?: string;
    branches: BranchInfo[];
    busyOwnerKeys: Set<string>;
    hiddenRecentBranchCount: number;
    isAwaitingSshPassphrase: boolean;
    isExpanded: boolean;
    isPending: boolean;
    pendingWorktreeCheckoutKey?: string;
    pendingWorktreeRemovalKey?: string;
    project: ProjectConfig;
    selectedBranchName?: string;
    staleBranchCount: number;
    canShowMoreRecentBranches: boolean;
    canShowStaleBranches: boolean;
    onCheckoutBranch: (projectId: string, branchName: string) => Promise<void>;
    onRemoveWorktree: (projectId: string, branchName: string) => Promise<void>;
    onSelectBranch: (project: ProjectConfig, branch: BranchInfo) => void;
    onShowMoreRecentBranches: () => void;
    onShowStaleBranches: () => void;
};

export function SidebarProjectBranches({
    branchCount,
    branchError,
    branches,
    busyOwnerKeys,
    canShowMoreRecentBranches,
    canShowStaleBranches,
    hiddenRecentBranchCount,
    isAwaitingSshPassphrase,
    isExpanded,
    isPending,
    pendingWorktreeCheckoutKey,
    pendingWorktreeRemovalKey,
    project,
    selectedBranchName,
    staleBranchCount,
    onCheckoutBranch,
    onRemoveWorktree,
    onSelectBranch,
    onShowMoreRecentBranches,
    onShowStaleBranches,
}: SidebarProjectBranchesProps) {
    return (
        <div
            className={cn(
                "relative mt-0.5 ml-2 flex min-w-0 flex-col gap-0.5 py-0.5 pl-4",
                !isExpanded && "opacity-90",
            )}
        >
            <SidebarProjectBranchStatus
                branchCount={branchCount}
                error={branchError}
                isAwaitingSshPassphrase={isAwaitingSshPassphrase}
                isExpanded={isExpanded}
                isPending={isPending}
            />

            {branches.length > 0 ? (
                <div
                    className="before:bg-sidebar-border/80 relative flex min-w-0
                        flex-col gap-0.5 before:absolute before:top-[-0.25rem]
                        before:bottom-[22.5px] before:-left-4 before:w-px
                        before:rounded-full before:content-['']"
                >
                    {branches.map((branch) => (
                        <SidebarBranchItem
                            branch={branch}
                            isBusy={busyOwnerKeys.has(
                                getWorktreeOwnerKey(project.id, branch.name),
                            )}
                            isCollapsedPreview={!isExpanded}
                            isSelected={selectedBranchName === branch.name}
                            key={branch.remoteName}
                            pendingAction={getSidebarBranchPendingAction({
                                branch,
                                pendingWorktreeCheckoutKey,
                                pendingWorktreeRemovalKey,
                                projectId: project.id,
                            })}
                            onCheckoutBranch={(branchName) =>
                                onCheckoutBranch(project.id, branchName)
                            }
                            onRemoveWorktree={(branchName) =>
                                onRemoveWorktree(project.id, branchName)
                            }
                            onSelectBranch={() =>
                                onSelectBranch(project, branch)
                            }
                        />
                    ))}
                </div>
            ) : null}

            {canShowMoreRecentBranches ? (
                <Button
                    className="text-muted-foreground
                        hover:text-sidebar-accent-foreground h-7 justify-start
                        rounded-md px-2 text-[11px]"
                    size="xs"
                    type="button"
                    variant="ghost"
                    onClick={onShowMoreRecentBranches}
                >
                    Show more ({hiddenRecentBranchCount})
                </Button>
            ) : null}

            {canShowStaleBranches ? (
                <Button
                    className="text-muted-foreground
                        hover:text-sidebar-accent-foreground h-7 justify-start
                        rounded-md px-2 text-[11px]"
                    size="xs"
                    type="button"
                    variant="ghost"
                    onClick={onShowStaleBranches}
                >
                    Show stale ({staleBranchCount})
                </Button>
            ) : null}
        </div>
    );
}
