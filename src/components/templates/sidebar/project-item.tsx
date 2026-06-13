import { Spinner, Surface } from "@heroui/react";
import { ChevronDown, ChevronRight, Folder, RefreshCw } from "lucide-react";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";
import { shortenPath } from "@/lib/format";
import { AppButton } from "@/components/atoms/AppButton";
import { SidebarBranchItem } from "@/components/templates/sidebar/branch-item";

type SidebarProjectItemProps = {
    branches: BranchInfo[];
    error?: string;
    isExpanded: boolean;
    isLoading: boolean;
    isSelected: boolean;
    isUpdatingProject: boolean;
    project: ProjectConfig;
    removingWorktrees: Set<string>;
    selectedBranch?: string;
    onRemoveWorktree: (
        project: ProjectConfig,
        branch: BranchInfo,
    ) => Promise<void>;
    onSelectBranch: (
        project: ProjectConfig,
        branch: BranchInfo,
    ) => Promise<void>;
    onToggleProject: (project: ProjectConfig) => Promise<void>;
    onUpdateProject: (project: ProjectConfig) => Promise<unknown>;
};

export function SidebarProjectItem({
    branches,
    error,
    isExpanded,
    isLoading,
    isSelected,
    isUpdatingProject,
    project,
    removingWorktrees,
    selectedBranch,
    onRemoveWorktree,
    onSelectBranch,
    onToggleProject,
    onUpdateProject,
}: SidebarProjectItemProps) {
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
                    onClick={() => void onToggleProject(project)}
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
                <AppButton
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
                </AppButton>
            </div>

            {isExpanded ? (
                <div className="tree-branch-list">
                    {isLoading ? (
                        <Surface className="tree-inline-state flex items-center gap-2">
                            <Spinner size="sm" />
                            Loading branches...
                        </Surface>
                    ) : null}

                    {error ? (
                        <Surface className="tree-inline-state border border-danger/20 text-danger">
                            {error}
                        </Surface>
                    ) : null}

                    {!isLoading && !error && branches.length === 0 ? (
                        <div className="tree-empty">No remote branches.</div>
                    ) : null}

                    {branches.map((branch) => (
                        <SidebarBranchItem
                            branch={branch}
                            isRemovingWorktree={removingWorktrees.has(
                                `${project.id}:${branch.name}`,
                            )}
                            isSelected={selectedBranch === branch.name}
                            key={branch.remoteName}
                            project={project}
                            onRemoveWorktree={onRemoveWorktree}
                            onSelectBranch={onSelectBranch}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}
