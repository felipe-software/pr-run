import { Spinner, Surface } from "@heroui/react";
import { ChevronDown, ChevronRight, Folder, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { Button } from "@/lib/components/atoms/button";
import { SidebarBranchItem } from "@/lib/components/templates/sidebar/sidebar-branch-item";
import { useProjectBranchesQuery } from "@/lib/hooks/query/use-project-branches-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import { shortenPath } from "@/lib/format";
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
        <div className="tree-node">
            <div
                className={[
                    "tree-project-shell",
                    isSelected ? "tree-row-selected" : "",
                ].join(" ")}
            >
                <button
                    aria-expanded={isExpanded}
                    className="tree-row tree-project-row"
                    type="button"
                    onClick={() => onToggleProject(project.id)}
                >
                    {isExpanded ? (
                        <ChevronDown className="tree-chevron" />
                    ) : (
                        <ChevronRight className="tree-chevron" />
                    )}
                    <Folder className="tree-icon" />
                    <span className="min-w-0 flex-1">
                        <span className="tree-label block truncate">
                            {project.name}
                        </span>
                        <span className="tree-meta block truncate">
                            {shortenPath(project.path)}
                        </span>
                    </span>
                </button>
                <Button
                    aria-label={`Reload ${project.name} worktrees`}
                    className="tree-project-action"
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
                <div className="tree-branch-list">
                    {branchesQuery.isPending ? (
                        <Surface className="tree-inline-state flex items-center gap-2">
                            <Spinner size="sm" />
                            Loading branches...
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending && isAwaitingSshPassphrase ? (
                        <Surface className="tree-inline-state text-muted-foreground">
                            Waiting for SSH passphrase...
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending &&
                    !isAwaitingSshPassphrase &&
                    branchError ? (
                        <Surface className="tree-inline-state border border-danger/20 text-danger">
                            {branchError}
                        </Surface>
                    ) : null}

                    {!branchesQuery.isPending &&
                    !branchError &&
                    (branchesQuery.data?.length ?? 0) === 0 ? (
                        <div className="tree-empty">No remote branches.</div>
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
