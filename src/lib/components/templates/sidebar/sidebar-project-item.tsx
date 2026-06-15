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
        "flex w-full items-center gap-2 bg-transparent px-1.5 py-1.5 text-left text-foreground transition hover:bg-muted/20 hover:text-foreground";
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
        <div className="relative">
            <div
                className={cn(
                    "relative flex items-stretch rounded-sm",
                    isSelected && "bg-muted/20",
                )}
            >
                <button
                    aria-expanded={isExpanded}
                    className={cn(rowClassName, "pr-10")}
                    type="button"
                    onClick={() => onToggleProject(project.id)}
                >
                    {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] leading-[1.35] tracking-[-0.01em]">
                            {project.name}
                        </span>
                        <span className="block truncate text-[11px] leading-[1.35] text-muted-foreground">
                            {shortenPath(project.path)}
                        </span>
                    </span>
                </button>
                <Button
                    aria-label={`Reload ${project.name} worktrees`}
                    className="absolute top-1/2 right-0.5 h-7 w-7 min-w-7 -translate-y-1/2 px-0 opacity-70 hover:opacity-100"
                    isDisabled={isUpdatingProject}
                    isIconOnly
                    size="sm"
                    type="button"
                    onPress={() => void onUpdateProject(project)}
                >
                    <RefreshCw
                        className={[
                            "h-4 w-4",
                            isUpdatingProject ? "animate-spin" : "",
                        ].join(" ")}
                    />
                </Button>
            </div>

            {isExpanded ? (
                <div className="relative mt-1 pl-4 before:absolute before:top-0 before:bottom-[17px] before:left-1 before:w-px before:bg-border before:content-['']">
                    {branchesQuery.isPending ? (
                        <Surface className="ml-2 flex items-center gap-2 px-2 py-1.5 text-[11px] leading-[1.45] text-muted-foreground">
                            <Spinner size="sm" />
                            Loading branches...
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending && isAwaitingSshPassphrase ? (
                        <Surface className="ml-2 px-2 py-1.5 text-[11px] leading-[1.45] text-muted-foreground">
                            Waiting for SSH passphrase...
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending &&
                    !isAwaitingSshPassphrase &&
                    branchError ? (
                        <Surface className="ml-2 border border-danger/20 px-2 py-1.5 text-[11px] leading-[1.45] text-danger">
                            {branchError}
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending &&
                    !branchError &&
                    (branchesQuery.data?.length ?? 0) === 0 ? (
                        <div className="ml-2 px-2 py-1.5 text-[11px] leading-[1.45] text-muted-foreground">
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
