import { Spinner, Surface } from "@heroui/react";
import { ChevronDown, ChevronRight, Folder, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { Button } from "@/lib/components/atoms/button";
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
        "peer/menu-button flex min-h-10 w-full cursor-pointer items-center overflow-hidden rounded-lg bg-transparent px-1.5 py-1 text-left text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-foreground/20 active:bg-sidebar-accent";
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
                    "relative isolate flex items-stretch rounded-lg",
                    isSelected && "bg-sidebar-accent",
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
                <Button
                    aria-label={`Reload ${project.name} worktrees`}
                    className="pointer-events-none absolute top-1/2 right-1 z-[1] h-6 min-w-6 -translate-y-1/2 rounded-md border-transparent bg-sidebar/90 px-0 text-muted-foreground/60 opacity-0 shadow-sm transition-opacity data-[hover=true]:border-transparent data-[hover=true]:bg-sidebar-accent data-[hover=true]:text-sidebar-accent-foreground group-hover/menu-item:pointer-events-auto group-hover/menu-item:opacity-100 group-focus-within/menu-item:pointer-events-auto group-focus-within/menu-item:opacity-100"
                    isDisabled={isUpdatingProject}
                    isIconOnly
                    size="sm"
                    type="button"
                    onPress={() => void onUpdateProject(project)}
                >
                    <RefreshCw
                        className={[
                            "h-3.5 w-3.5",
                            isUpdatingProject ? "animate-spin" : "",
                        ].join(" ")}
                    />
                </Button>
            </div>

            {isExpanded ? (
                <div className="relative ml-1 mt-0.5 flex min-w-0 flex-col gap-0.5 border-l border-sidebar-border py-0.5 pl-1">
                    {branchesQuery.isPending ? (
                        <Surface className="flex h-7 items-center gap-2 rounded-lg bg-transparent px-2 text-[11px] leading-5 text-muted-foreground/70">
                            <Spinner size="sm" />
                            Loading branches...
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending && isAwaitingSshPassphrase ? (
                        <Surface className="rounded-lg bg-transparent px-2 py-1.5 text-[11px] leading-5 text-muted-foreground/70">
                            Waiting for SSH passphrase...
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending &&
                    !isAwaitingSshPassphrase &&
                    branchError ? (
                        <Surface className="rounded-lg border border-danger/20 bg-danger/10 px-2 py-1.5 text-[11px] leading-5 text-danger">
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
