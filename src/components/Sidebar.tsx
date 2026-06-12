import { Spinner, Surface } from "@heroui/react";
import {
    ChevronDown,
    ChevronRight,
    Folder,
    GitBranch,
    KeyRound,
    Moon,
    Plus,
    RefreshCw,
    SunMedium,
    Trash2,
} from "lucide-react";
import type { BranchInfo, ProjectConfig, ProjectGroup } from "../types/pr-run";
import { formatBranchAge, shortenPath } from "../lib/format";
import { AppButton } from "./atoms/AppButton";

type SidebarProps = {
    groups: ProjectGroup[];
    branchesByProject: Record<string, BranchInfo[]>;
    branchErrors: Record<string, string | undefined>;
    expandedGroups: Set<string>;
    expandedProjects: Set<string>;
    loadingProjects: Set<string>;
    removingWorktrees: Set<string>;
    selectedProjectId?: string;
    selectedBranch?: string;
    sidebarWidth: number;
    theme: "dark" | "light";
    updatingProjects: Set<string>;
    onBeginResize: () => void;
    onAddProject: () => void;
    onUpdateProject: (project: ProjectConfig) => Promise<unknown>;
    onToggleTheme: () => void;
    onOpenSshPassphrase: () => void;
    onRemoveWorktree: (
        project: ProjectConfig,
        branch: BranchInfo,
    ) => Promise<void>;
    onToggleGroup: (groupId: string) => void;
    onToggleProject: (project: ProjectConfig) => Promise<void>;
    onSelectBranch: (
        project: ProjectConfig,
        branch: BranchInfo,
    ) => Promise<void>;
};

export function Sidebar({
    groups,
    branchesByProject,
    branchErrors,
    expandedGroups,
    expandedProjects,
    loadingProjects,
    removingWorktrees,
    selectedProjectId,
    selectedBranch,
    sidebarWidth,
    theme,
    updatingProjects,
    onBeginResize,
    onAddProject,
    onUpdateProject,
    onToggleTheme,
    onOpenSshPassphrase,
    onRemoveWorktree,
    onToggleGroup,
    onToggleProject,
    onSelectBranch,
}: SidebarProps) {
    return (
        <aside
            className="app-sidebar relative flex h-screen min-h-0 shrink-0 flex-col border-r border-border/80"
            style={{ width: `${sidebarWidth}px` }}
        >
            <header className="flex items-center justify-between px-3 py-3">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold tracking-[0.08em] uppercase">
                        PR Run
                    </div>
                </div>
                <div className="flex gap-2">
                    <AppButton
                        aria-label="Toggle theme"
                        className="h-8 min-w-8 px-2 text-[11px]"
                        isIconOnly
                        type="button"
                        onPress={onToggleTheme}
                    >
                        {theme === "dark" ? (
                            <SunMedium className="h-4 w-4" />
                        ) : (
                            <Moon className="h-4 w-4" />
                        )}
                    </AppButton>
                    <AppButton
                        aria-label="SSH passphrase"
                        className="h-8 min-w-8 px-2 text-[11px]"
                        isIconOnly
                        type="button"
                        onPress={onOpenSshPassphrase}
                    >
                        <KeyRound className="h-4 w-4" />
                    </AppButton>
                    <AppButton
                        aria-label="Add project"
                        className="h-8 w-8"
                        isIconOnly
                        type="button"
                        onPress={onAddProject}
                    >
                        <Plus className="h-4 w-4" />
                    </AppButton>
                </div>
            </header>

            <div className="min-h-0 flex-1 overflow-auto px-2 pb-4">
                {groups.map((group) => {
                    const isGroupExpanded = expandedGroups.has(group.id);

                    return (
                        <section className="mb-2" key={group.id}>
                            <button
                                aria-expanded={isGroupExpanded}
                                className="tree-row tree-group-row"
                                type="button"
                                onClick={() => onToggleGroup(group.id)}
                            >
                                {isGroupExpanded ? (
                                    <ChevronDown className="tree-chevron" />
                                ) : (
                                    <ChevronRight className="tree-chevron" />
                                )}
                                <span className="tree-label flex-1">
                                    {group.id === "default"
                                        ? "Projects"
                                        : group.name}
                                </span>
                                <span className="tree-meta">
                                    {group.projects.length}
                                </span>
                            </button>

                            {isGroupExpanded ? (
                                <div className="tree-children">
                                    {group.projects.length === 0 ? (
                                        <div className="tree-empty">
                                            No projects added.
                                        </div>
                                    ) : null}

                                    {group.projects.map((project) => {
                                        const isProjectExpanded =
                                            expandedProjects.has(project.id);
                                        const branches =
                                            branchesByProject[project.id] ?? [];
                                        const isLoading = loadingProjects.has(
                                            project.id,
                                        );
                                        const isUpdatingProject =
                                            updatingProjects.has(project.id);
                                        const error = branchErrors[project.id];

                                        return (
                                            <div
                                                className="tree-node"
                                                key={project.id}
                                            >
                                                <div
                                                    className={[
                                                        "tree-project-shell",
                                                        selectedProjectId ===
                                                        project.id
                                                            ? "tree-row-selected"
                                                            : "",
                                                    ].join(" ")}
                                                >
                                                    <button
                                                        aria-expanded={
                                                            isProjectExpanded
                                                        }
                                                        className="tree-row tree-project-row"
                                                        type="button"
                                                        onClick={() =>
                                                            void onToggleProject(
                                                                project,
                                                            )
                                                        }
                                                    >
                                                        {isProjectExpanded ? (
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
                                                                {shortenPath(
                                                                    project.path,
                                                                )}
                                                            </span>
                                                        </span>
                                                    </button>
                                                    <AppButton
                                                        aria-label={`Reload ${project.name} worktrees`}
                                                        className="tree-project-action"
                                                        isDisabled={
                                                            isUpdatingProject
                                                        }
                                                        isIconOnly
                                                        size="sm"
                                                        type="button"
                                                        onPress={() =>
                                                            void onUpdateProject(
                                                                project,
                                                            )
                                                        }
                                                    >
                                                        <RefreshCw
                                                            className={[
                                                                "h-4 w-4",
                                                                isUpdatingProject
                                                                    ? "animate-spin"
                                                                    : "",
                                                            ].join(" ")}
                                                        />
                                                    </AppButton>
                                                </div>

                                                {isProjectExpanded ? (
                                                    <div className="tree-branch-list">
                                                        {isLoading ? (
                                                            <Surface className="tree-inline-state flex items-center gap-2">
                                                                <Spinner size="sm" />
                                                                Loading
                                                                branches...
                                                            </Surface>
                                                        ) : null}

                                                        {error ? (
                                                            <Surface className="tree-inline-state border border-danger/20 text-danger">
                                                                {error}
                                                            </Surface>
                                                        ) : null}

                                                        {!isLoading &&
                                                        !error &&
                                                        branches.length ===
                                                            0 ? (
                                                            <div className="tree-empty">
                                                                No remote
                                                                branches.
                                                            </div>
                                                        ) : null}

                                                        {branches.map(
                                                            (branch) => {
                                                                const isSelected =
                                                                    selectedProjectId ===
                                                                        project.id &&
                                                                    selectedBranch ===
                                                                        branch.name;
                                                                const isRemovingWorktree =
                                                                    removingWorktrees.has(
                                                                        `${project.id}:${branch.name}`,
                                                                    );

                                                                return (
                                                                    <div
                                                                        className={[
                                                                            "tree-branch-shell",
                                                                            isSelected
                                                                                ? "tree-row-selected tree-branch-selected"
                                                                                : "",
                                                                        ].join(
                                                                            " ",
                                                                        )}
                                                                        key={
                                                                            branch.remoteName
                                                                        }
                                                                    >
                                                                        <button
                                                                            aria-selected={
                                                                                isSelected
                                                                            }
                                                                            className={[
                                                                                "tree-row tree-branch-row",
                                                                                branch.isStale
                                                                                    ? "tree-branch-stale"
                                                                                    : "",
                                                                            ].join(
                                                                                " ",
                                                                            )}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                void onSelectBranch(
                                                                                    project,
                                                                                    branch,
                                                                                )
                                                                            }
                                                                        >
                                                                            <span
                                                                                className={[
                                                                                    "tree-branch-marker",
                                                                                    branch.hasWorktree
                                                                                        ? "tree-branch-marker-active"
                                                                                        : "",
                                                                                ].join(
                                                                                    " ",
                                                                                )}
                                                                            >
                                                                                <GitBranch className="tree-icon" />
                                                                            </span>
                                                                            <span className="tree-label min-w-0 flex-1 truncate">
                                                                                {
                                                                                    branch.name
                                                                                }
                                                                            </span>
                                                                            <span className="tree-meta">
                                                                                {formatBranchAge(
                                                                                    branch.lastCommitTimestamp,
                                                                                )}
                                                                            </span>
                                                                        </button>
                                                                        {branch.hasWorktree ? (
                                                                            <AppButton
                                                                                aria-label={`Remove ${branch.name} worktree`}
                                                                                className="tree-branch-action"
                                                                                isDisabled={
                                                                                    isRemovingWorktree
                                                                                }
                                                                                isIconOnly
                                                                                size="sm"
                                                                                type="button"
                                                                                onPress={() =>
                                                                                    void onRemoveWorktree(
                                                                                        project,
                                                                                        branch,
                                                                                    )
                                                                                }
                                                                            >
                                                                                {isRemovingWorktree ? (
                                                                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                                                                ) : (
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                )}
                                                                            </AppButton>
                                                                        ) : null}
                                                                    </div>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </section>
                    );
                })}
            </div>

            <div
                aria-hidden="true"
                className="sidebar-resize-handle"
                onMouseDown={onBeginResize}
            />
        </aside>
    );
}
