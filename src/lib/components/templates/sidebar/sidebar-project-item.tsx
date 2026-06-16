import { ChevronDown, ChevronRight, Folder, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { Button } from "@/lib/components/atoms/button";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { SidebarBranchItem } from "@/lib/components/templates/sidebar/sidebar-branch-item";
import { useProjectBranchesQuery } from "@/lib/hooks/query/use-project-branches-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import { shortenPath } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ProjectConfig } from "@/types/pr-run";

type SidebarProjectItemProps = {
    isExpanded: boolean;
    isSelected: boolean;
    isUpdatingProject: boolean;
    pendingWorktreeRemovalKey?: string;
    project: ProjectConfig;
    selectedBranchName?: string;
    onRemoveWorktree: (projectId: string, branchName: string) => Promise<void>;
    onSelectBranch: (projectId: string, branchName: string) => void;
    onToggleProject: (projectId: string) => void;
    onUpdateProject: (project: ProjectConfig) => Promise<void>;
};

export function SidebarProjectItem({
    isExpanded,
    isSelected,
    isUpdatingProject,
    pendingWorktreeRemovalKey,
    project,
    selectedBranchName,
    onRemoveWorktree,
    onSelectBranch,
    onToggleProject,
    onUpdateProject,
}: SidebarProjectItemProps) {
    const rowClassName =
        "peer/menu-button flex min-h-10 w-full cursor-pointer items-center overflow-hidden rounded-md bg-transparent px-1.5 py-1 text-left text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring active:bg-sidebar-accent";
    const branchesQuery = useProjectBranchesQuery(project.id, isExpanded);
    const isAwaitingSshPassphrase = isHandledSshPromptError(
        branchesQuery.error,
    );
    const branchError = branchesQuery.error
        ? getErrorMessage(branchesQuery.error)
        : undefined;

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

    return (
        <div className="group/menu-item relative">
            <div
                className={cn(
                    "relative isolate flex items-stretch rounded-md",
                    isSelected &&
                        "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
            >
                <button
                    aria-expanded={isExpanded}
                    data-active={isSelected}
                    className={rowClassName}
                    type="button"
                    onClick={() => onToggleProject(project.id)}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    )}
                    <Folder className="ml-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <span className="ml-2 min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium leading-4 tracking-tight">
                            {project.name}
                        </span>
                        <span className="block truncate text-[10px] leading-4 text-muted-foreground/65">
                            {shortenPath(project.path)}
                        </span>
                    </span>
                </button>
                <div className="pointer-events-none absolute top-1/2 right-1 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity duration-150 group-hover/menu-item:pointer-events-auto group-hover/menu-item:opacity-100 group-focus-within/menu-item:pointer-events-auto group-focus-within/menu-item:opacity-100">
                    <Button
                        aria-label={`Reload ${project.name} worktrees`}
                        className="border-transparent bg-sidebar/90 text-muted-foreground/65 shadow-sm data-[hover=true]:bg-sidebar-accent data-[hover=true]:text-sidebar-accent-foreground"
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
                <div className="relative ml-1 mt-0.5 flex min-w-0 flex-col gap-0.5 border-l border-sidebar-border/80 py-0.5 pl-1">
                    {branchesQuery.isPending ? (
                        <div className="grid gap-1 px-1.5 py-1">
                            <Skeleton className="h-5 w-11/12" />
                            <Skeleton className="h-5 w-9/12" />
                            <Skeleton className="h-5 w-10/12" />
                        </div>
                    ) : null}

                    {!branchesQuery.isPending && isAwaitingSshPassphrase ? (
                        <Surface
                            className="border-0 bg-transparent px-2 py-1.5 text-[11px] leading-5 text-muted-foreground/70"
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
                        <div className="px-2 py-1.5 text-[11px] leading-5 text-muted-foreground/70">
                            No remote branches.
                        </div>
                    ) : null}

                    {(branchesQuery.data ?? []).map((branch) => (
                        <SidebarBranchItem
                            branch={branch}
                            isRemovingWorktree={
                                pendingWorktreeRemovalKey ===
                                `${project.id}:${branch.name}`
                            }
                            isSelected={selectedBranchName === branch.name}
                            key={branch.remoteName}
                            onRemoveWorktree={(branchName) =>
                                onRemoveWorktree(project.id, branchName)
                            }
                            onSelectBranch={(branchName) =>
                                onSelectBranch(project.id, branchName)
                            }
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
