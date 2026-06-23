import { ChevronDown, ChevronRight, Folder, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { BusyDot } from "@/lib/components/atoms/busy-dot";
import { Button } from "@/lib/components/atoms/button";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { SidebarBranchItem } from "@/lib/components/templates/sidebar/sidebar-branch-item";
import {
    getVisibleSidebarBranches,
    sortBranchesByLastCommit,
} from "@/lib/components/templates/sidebar/sidebar-sort";
import { useProjectBranchesQuery } from "@/lib/hooks/query/use-project-branches-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import { getWorktreeOwnerKey } from "@/lib/hooks/store/use-worktree-terminal-store";
import { shortenPath } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ProjectConfig } from "@/types/pr-run";

type SidebarProjectItemProps = {
    busyOwnerKeys: Set<string>;
    isExpanded: boolean;
    isBusy: boolean;
    isSelected: boolean;
    isUpdatingProject: boolean;
    pendingWorktreeCheckoutKey?: string;
    pendingWorktreeRemovalKey?: string;
    project: ProjectConfig;
    selectedBranchName?: string;
    onCheckoutBranch: (projectId: string, branchName: string) => Promise<void>;
    onRemoveWorktree: (projectId: string, branchName: string) => Promise<void>;
    onSelectBranch: (projectId: string, branchName: string) => void;
    onToggleProject: (projectId: string) => void;
    onUpdateProject: (project: ProjectConfig) => Promise<void>;
};

const INITIAL_VISIBLE_BRANCH_COUNT = 5;

export function SidebarProjectItem({
    busyOwnerKeys,
    isExpanded,
    isBusy,
    isSelected,
    isUpdatingProject,
    pendingWorktreeCheckoutKey,
    pendingWorktreeRemovalKey,
    project,
    selectedBranchName,
    onCheckoutBranch,
    onRemoveWorktree,
    onSelectBranch,
    onToggleProject,
    onUpdateProject,
}: SidebarProjectItemProps) {
    const [areAllRecentBranchesVisible, setAreAllRecentBranchesVisible] =
        useState(false);
    const [areStaleBranchesVisible, setAreStaleBranchesVisible] =
        useState(false);
    const branchesQuery = useProjectBranchesQuery(project.id, isExpanded);
    const isAwaitingSshPassphrase = isHandledSshPromptError(
        branchesQuery.error,
    );
    const branchError = branchesQuery.error
        ? getErrorMessage(branchesQuery.error)
        : undefined;
    const sortedBranches = useMemo(
        () => sortBranchesByLastCommit(branchesQuery.data ?? []),
        [branchesQuery.data],
    );
    const { hiddenRecentBranchCount, staleBranches, visibleBranches } = useMemo(
        () =>
            getVisibleSidebarBranches({
                areAllRecentBranchesVisible,
                areStaleBranchesVisible,
                branches: sortedBranches,
                busyOwnerKeys,
                initialVisibleBranchCount: INITIAL_VISIBLE_BRANCH_COUNT,
                projectId: project.id,
            }),
        [
            areAllRecentBranchesVisible,
            areStaleBranchesVisible,
            busyOwnerKeys,
            project.id,
            sortedBranches,
        ],
    );

    useEffect(() => {
        if (!isAwaitingSshPassphrase) {
            return;
        }

        useSshPassphraseStore
            .getState()
            .setRetryAction(() =>
                branchesQuery.refetch().then(() => undefined),
            );
    }, [branchesQuery, isAwaitingSshPassphrase]);
    const isActionVisible = isUpdatingProject;

    return (
        <div className="group/menu-item relative">
            <div
                className={cn(
                    "group relative isolate flex items-stretch rounded-md",
                    isSelected &&
                        "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
            >
                <button
                    aria-expanded={isExpanded}
                    data-active={isSelected}
                    className="peer/menu-button text-sidebar-foreground
                        hover:bg-sidebar-accent
                        hover:text-sidebar-accent-foreground
                        focus-visible:ring-ring active:bg-sidebar-accent flex
                        min-w-0 flex-1 cursor-pointer items-center
                        overflow-hidden rounded-md bg-transparent px-2 py-1.5
                        text-left text-sm transition-colors outline-none
                        focus-visible:ring-2"
                    type="button"
                    onClick={() => onToggleProject(project.id)}
                >
                    {isExpanded ? (
                        <ChevronDown
                            className="text-muted-foreground/70 h-3.5 w-3.5
                                shrink-0"
                        />
                    ) : (
                        <ChevronRight
                            className="text-muted-foreground/70 h-3.5 w-3.5
                                shrink-0"
                        />
                    )}
                    <Folder
                        className="text-muted-foreground/70 ml-0.5 h-3.5 w-3.5
                            shrink-0"
                    />
                    {isBusy ? <BusyDot /> : null}
                    <div className="ml-2 flex min-w-0 flex-1 justify-between">
                        <span
                            className="block truncate text-xs leading-4
                                font-medium tracking-tight"
                        >
                            {project.name}
                        </span>
                        <span
                            className={cn(
                                `text-muted-foreground/65 pointer-events-none
                                block truncate text-[10px] leading-4
                                transition-opacity duration-150
                                group-focus-within/menu-item:opacity-0
                                group-hover/menu-item:opacity-0`,
                                isActionVisible && "opacity-0",
                            )}
                        >
                            {shortenPath(project.path)}
                        </span>
                    </div>
                </button>
                <div
                    className={cn(
                        `pointer-events-none absolute inset-y-0 right-0 flex
                        items-center px-1 opacity-0 transition-opacity
                        duration-150
                        group-focus-within/menu-item:pointer-events-auto
                        group-focus-within/menu-item:opacity-100
                        group-hover/menu-item:pointer-events-auto
                        group-hover/menu-item:opacity-100`,
                        isActionVisible && "pointer-events-auto opacity-100",
                    )}
                >
                    <Button
                        aria-label={`Reload ${project.name} worktrees`}
                        className="text-muted-foreground/65
                            data-[hover=true]:bg-sidebar-accent
                            data-[hover=true]:text-sidebar-accent-foreground
                            border-transparent bg-transparent shadow-none"
                        isDisabled={isUpdatingProject}
                        isIconOnly
                        size="icon-xs"
                        type="button"
                        onPress={() => {
                            onUpdateProject(project);
                        }}
                    >
                        <RefreshCw
                            className={[
                                "h-3.5 w-3.5",
                                isUpdatingProject ? "animate-spin" : "",
                            ].join(" ")}
                        />
                    </Button>
                </div>
            </div>

            {isExpanded ? (
                <div
                    className="border-sidebar-border/80 relative mt-0.5 ml-2
                        flex min-w-0 flex-col gap-0.5 border-l py-0.5 pl-1"
                >
                    {branchesQuery.isPending ? (
                        <div className="grid gap-1 px-1.5 py-1">
                            <Skeleton className="h-5 w-11/12" />
                            <Skeleton className="h-5 w-9/12" />
                            <Skeleton className="h-5 w-10/12" />
                        </div>
                    ) : null}

                    {!branchesQuery.isPending && isAwaitingSshPassphrase ? (
                        <Surface
                            className="text-muted-foreground/70 border-0
                                bg-transparent px-2 py-1.5 text-[11px]
                                leading-5"
                            variant="plain"
                        >
                            Waiting for SSH passphrase...
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending &&
                    !isAwaitingSshPassphrase &&
                    branchError ? (
                        <Surface
                            className="px-2 py-1.5 text-[11px] leading-5"
                            variant="danger"
                        >
                            {branchError}
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending &&
                    !branchError &&
                    (branchesQuery.data?.length ?? 0) === 0 ? (
                        <div
                            className="text-muted-foreground/70 px-2 py-1.5
                                text-[11px] leading-5"
                        >
                            No remote branches.
                        </div>
                    ) : null}

                    {visibleBranches.map((branch) => (
                        <SidebarBranchItem
                            branch={branch}
                            isBusy={busyOwnerKeys.has(
                                getWorktreeOwnerKey(project.id, branch.name),
                            )}
                            isCheckingOutWorktree={
                                pendingWorktreeCheckoutKey ===
                                `${project.id}:${branch.name}`
                            }
                            isRemovingWorktree={
                                pendingWorktreeRemovalKey ===
                                `${project.id}:${branch.name}`
                            }
                            isSelected={selectedBranchName === branch.name}
                            key={branch.remoteName}
                            onCheckoutBranch={(branchName) =>
                                onCheckoutBranch(project.id, branchName)
                            }
                            onRemoveWorktree={(branchName) =>
                                onRemoveWorktree(project.id, branchName)
                            }
                            onSelectBranch={(branchName) =>
                                onSelectBranch(project.id, branchName)
                            }
                        />
                    ))}

                    {!areAllRecentBranchesVisible &&
                    hiddenRecentBranchCount > 0 ? (
                        <Button
                            className="text-muted-foreground
                                hover:text-sidebar-accent-foreground h-7
                                justify-start rounded-md px-2 text-[11px]"
                            size="xs"
                            type="button"
                            onPress={() => setAreAllRecentBranchesVisible(true)}
                        >
                            Show more ({hiddenRecentBranchCount})
                        </Button>
                    ) : null}

                    {(areAllRecentBranchesVisible ||
                        hiddenRecentBranchCount === 0) &&
                    !areStaleBranchesVisible &&
                    staleBranches.length > 0 ? (
                        <Button
                            className="text-muted-foreground
                                hover:text-sidebar-accent-foreground h-7
                                justify-start rounded-md px-2 text-[11px]"
                            size="xs"
                            type="button"
                            onPress={() => setAreStaleBranchesVisible(true)}
                        >
                            Show stale ({staleBranches.length})
                        </Button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
