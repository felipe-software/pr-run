import { Card, Spinner, Surface } from "@heroui/react";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AddProjectDialog } from "./components/AddProjectDialog";
import { MainPanel } from "./components/MainPanel";
import { Sidebar } from "./components/Sidebar";
import { SshPassphraseDialog } from "./components/SshPassphraseDialog";
import type {
    BranchInfo,
    CommitInfo,
    ProjectConfig,
    ProjectsConfig,
    UpdateWorktreesResult,
} from "./types/pr-run";

type SelectedBranch = {
    project: ProjectConfig;
    branch: BranchInfo;
};

const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_WIDTH = 560;

function App() {
    const [config, setConfig] = useState<ProjectsConfig | null>(null);
    const [configError, setConfigError] = useState<string>();
    const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [addProjectError, setAddProjectError] = useState<string>();
    const [isSshPassphraseOpen, setIsSshPassphraseOpen] = useState(false);
    const [isSavingSshPassphrase, setIsSavingSshPassphrase] = useState(false);
    const [sshPassphraseError, setSshPassphraseError] = useState<string>();
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
        () => new Set(["default"]),
    );
    const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
        () => new Set(),
    );
    const [loadingProjects, setLoadingProjects] = useState<Set<string>>(
        () => new Set(),
    );
    const [updatingProjects, setUpdatingProjects] = useState<Set<string>>(
        () => new Set(),
    );
    const [checkingOutBranches, setCheckingOutBranches] = useState<Set<string>>(
        () => new Set(),
    );
    const [removingWorktrees, setRemovingWorktrees] = useState<Set<string>>(
        () => new Set(),
    );
    const [branchesByProject, setBranchesByProject] = useState<
        Record<string, BranchInfo[]>
    >({});
    const [branchErrors, setBranchErrors] = useState<
        Record<string, string | undefined>
    >({});
    const [selected, setSelected] = useState<SelectedBranch | null>(null);
    const [actionMessage, setActionMessage] = useState<string>();
    const [actionError, setActionError] = useState<string>();
    const [commits, setCommits] = useState<CommitInfo[]>([]);
    const [commitsError, setCommitsError] = useState<string>();
    const [isLoadingCommits, setIsLoadingCommits] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light">(() => {
        return localStorage.getItem("pr-run-theme") === "light"
            ? "light"
            : "dark";
    });
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const stored = Number(localStorage.getItem("pr-run-sidebar-width"));

        return Number.isFinite(stored)
            ? clamp(stored, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH)
            : 320;
    });
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const pendingGitActionRef = useRef<null | (() => Promise<void>)>(null);

    const groups = config?.groups ?? [];

    const selectedProjectId = selected?.project.id;
    const selectedBranch = selected?.branch.name;

    const apiAvailable = useMemo(() => typeof window.prRun !== "undefined", []);

    useEffect(() => {
        if (!apiAvailable) {
            setConfigError(
                "Electron API is unavailable. Open this app through Electron.",
            );
            return;
        }

        void loadConfig();
    }, [apiAvailable]);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.style.colorScheme = theme;
        localStorage.setItem("pr-run-theme", theme);
    }, [theme]);

    useEffect(() => {
        if (!isResizingSidebar) {
            return;
        }

        function handleMouseMove(event: MouseEvent) {
            setSidebarWidth(
                clamp(event.clientX, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH),
            );
        }

        function handleMouseUp() {
            setIsResizingSidebar(false);
        }

        document.body.classList.add("is-resizing-sidebar");
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            document.body.classList.remove("is-resizing-sidebar");
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizingSidebar]);

    useEffect(() => {
        localStorage.setItem("pr-run-sidebar-width", String(sidebarWidth));
    }, [sidebarWidth]);

    async function loadConfig() {
        try {
            setConfigError(undefined);
            setConfig(await window.prRun.getConfig());
        } catch (error) {
            setConfigError(errorMessage(error));
        }
    }

    async function addProject(projectPath: string) {
        if (!projectPath) {
            setAddProjectError("Enter a project path.");
            return;
        }

        try {
            setIsAddingProject(true);
            setAddProjectError(undefined);
            await window.prRun.addProject(projectPath);
            await loadConfig();
            setIsAddProjectOpen(false);
        } catch (error) {
            setAddProjectError(errorMessage(error));
        } finally {
            setIsAddingProject(false);
        }
    }

    function toggleGroup(groupId: string) {
        setExpandedGroups((current) => {
            const next = new Set(current);

            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }

            return next;
        });
    }

    async function toggleProject(project: ProjectConfig) {
        const wasExpanded = expandedProjects.has(project.id);

        setExpandedProjects((current) => {
            const next = new Set(current);

            if (next.has(project.id)) {
                next.delete(project.id);
            } else {
                next.add(project.id);
            }

            return next;
        });

        if (!wasExpanded && !branchesByProject[project.id]) {
            await loadBranches(project);
        }
    }

    async function loadBranches(project: ProjectConfig) {
        setLoadingProjects((current) => new Set(current).add(project.id));
        setBranchErrors((current) => ({ ...current, [project.id]: undefined }));

        try {
            const branches = await window.prRun.listBranches(project.id);
            setBranchesByProject((current) => ({
                ...current,
                [project.id]: branches,
            }));
            setSelected((current) => {
                if (!current || current.project.id !== project.id) {
                    return current;
                }

                const updatedBranch = branches.find(
                    (item) => item.name === current.branch.name,
                );

                return updatedBranch
                    ? { project: current.project, branch: updatedBranch }
                    : current;
            });
            return branches;
        } catch (error) {
            openSshPassphraseIfNeeded(error, () =>
                loadBranches(project).then(() => undefined),
            );
            setBranchErrors((current) => ({
                ...current,
                [project.id]: errorMessage(error),
            }));
        } finally {
            setLoadingProjects((current) => {
                const next = new Set(current);
                next.delete(project.id);
                return next;
            });
        }
    }

    async function selectBranch(project: ProjectConfig, branch: BranchInfo) {
        setSelected({ project, branch });
        setActionMessage(undefined);
        setActionError(undefined);
        setCommits([]);
        setCommitsError(undefined);

        await loadCommitHistory(project, branch.name);
    }

    async function checkoutBranch(project: ProjectConfig, branch: BranchInfo) {
        const branchKey = worktreeActionKey(project.id, branch.name);

        try {
            setCheckingOutBranches((current) =>
                new Set(current).add(branchKey),
            );
            setActionError(undefined);
            const result = await window.prRun.checkoutBranch(
                project.id,
                branch.name,
            );
            const updatedBranch = {
                ...branch,
                hasWorktree: true,
                worktreePath: result.worktreePath,
            };

            setSelected({ project, branch: updatedBranch });
            setActionMessage(
                result.status === "ready"
                    ? "worktree ready"
                    : "Worktree created",
            );
            setBranchesByProject((current) => ({
                ...current,
                [project.id]: (current[project.id] ?? []).map((item) =>
                    item.name === branch.name ? updatedBranch : item,
                ),
            }));
            await loadCommitHistory(project, branch.name);
        } catch (error) {
            openSshPassphraseIfNeeded(error, () =>
                checkoutBranch(project, branch).then(() => undefined),
            );
            setActionError(errorMessage(error));
        } finally {
            setCheckingOutBranches((current) => {
                const next = new Set(current);
                next.delete(branchKey);
                return next;
            });
        }
    }

    async function removeWorktree(project: ProjectConfig, branch: BranchInfo) {
        const branchKey = worktreeActionKey(project.id, branch.name);

        try {
            setRemovingWorktrees((current) => new Set(current).add(branchKey));
            setActionError(undefined);
            const result = await window.prRun.removeWorktree(
                project.id,
                branch.name,
            );
            const updatedBranch = {
                ...branch,
                hasWorktree: false,
            };

            setActionMessage(result.message);
            setBranchesByProject((current) => ({
                ...current,
                [project.id]: (current[project.id] ?? []).map((item) =>
                    item.name === branch.name ? updatedBranch : item,
                ),
            }));
            setSelected((current) =>
                current?.project.id === project.id &&
                current.branch.name === branch.name
                    ? { project, branch: updatedBranch }
                    : current,
            );
        } catch (error) {
            openSshPassphraseIfNeeded(error, () =>
                removeWorktree(project, branch).then(() => undefined),
            );
            setActionError(errorMessage(error));
        } finally {
            setRemovingWorktrees((current) => {
                const next = new Set(current);
                next.delete(branchKey);
                return next;
            });
        }
    }

    async function loadCommitHistory(project: ProjectConfig, branch: string) {
        try {
            setIsLoadingCommits(true);
            setCommitsError(undefined);
            setCommits(await window.prRun.getCommitHistory(project.id, branch));
        } catch (error) {
            openSshPassphraseIfNeeded(error, () =>
                loadCommitHistory(project, branch).then(() => undefined),
            );
            setCommitsError(errorMessage(error));
        } finally {
            setIsLoadingCommits(false);
        }
    }

    async function updateProject(project: ProjectConfig) {
        try {
            setUpdatingProjects((current) => new Set(current).add(project.id));
            setActionError(undefined);
            const result: UpdateWorktreesResult =
                await window.prRun.updateProjectWorktrees(project.id);

            setActionMessage(result.message);
            await loadBranches(project);
            if (selected?.project.id === project.id) {
                await loadCommitHistory(project, selected.branch.name);
            }
            return result;
        } catch (error) {
            openSshPassphraseIfNeeded(error, () =>
                updateProject(project).then(() => undefined),
            );
            setActionError(errorMessage(error));
        } finally {
            setUpdatingProjects((current) => {
                const next = new Set(current);
                next.delete(project.id);
                return next;
            });
        }
    }

    async function reloadSelectedCommits() {
        if (!selected) {
            return;
        }

        await loadCommitHistory(selected.project, selected.branch.name);
    }

    async function saveSshPassphrase(passphrase: string) {
        try {
            setIsSavingSshPassphrase(true);
            setSshPassphraseError(undefined);
            await window.prRun.setSshPassphrase(passphrase);
            setIsSshPassphraseOpen(false);
            const pendingAction = pendingGitActionRef.current;
            pendingGitActionRef.current = null;

            if (pendingAction) {
                await pendingAction();
            }
        } catch (error) {
            setSshPassphraseError(errorMessage(error));
        } finally {
            setIsSavingSshPassphrase(false);
        }
    }

    function openSshPassphraseIfNeeded(
        error: unknown,
        retryAction?: () => Promise<void>,
    ) {
        if (
            errorCode(error) === "SSH_AUTH_REQUIRED" ||
            errorAction(error) === "prompt_ssh_passphrase"
        ) {
            pendingGitActionRef.current = retryAction ?? null;
            setSshPassphraseError(undefined);
            setIsSshPassphraseOpen(true);
        }
    }

    if (configError) {
        return (
            <div className="grid h-screen place-items-center overflow-hidden bg-background p-8 text-foreground">
                <Card className="max-w-lg rounded-lg border border-danger/25 bg-danger/10 text-danger">
                    <Card.Content className="flex gap-3 p-5">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>{configError}</span>
                    </Card.Content>
                </Card>
            </div>
        );
    }

    if (!config) {
        return (
            <Surface className="grid h-screen place-items-center overflow-hidden bg-background text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    Loading PR Run...
                </span>
            </Surface>
        );
    }

    return (
        <Surface className="flex h-screen min-h-0 overflow-hidden rounded-none bg-background text-foreground">
            <Sidebar
                branchErrors={branchErrors}
                branchesByProject={branchesByProject}
                expandedGroups={expandedGroups}
                expandedProjects={expandedProjects}
                groups={groups}
                loadingProjects={loadingProjects}
                removingWorktrees={removingWorktrees}
                selectedBranch={selectedBranch}
                selectedProjectId={selectedProjectId}
                sidebarWidth={sidebarWidth}
                theme={theme}
                updatingProjects={updatingProjects}
                onBeginResize={() => setIsResizingSidebar(true)}
                onAddProject={() => {
                    setAddProjectError(undefined);
                    setIsAddProjectOpen(true);
                }}
                onUpdateProject={updateProject}
                onToggleTheme={() =>
                    setTheme((current) =>
                        current === "dark" ? "light" : "dark",
                    )
                }
                onOpenSshPassphrase={() => {
                    setSshPassphraseError(undefined);
                    setIsSshPassphraseOpen(true);
                }}
                onRemoveWorktree={removeWorktree}
                onSelectBranch={selectBranch}
                onToggleGroup={toggleGroup}
                onToggleProject={toggleProject}
            />
            <MainPanel
                actionError={actionError}
                actionMessage={actionMessage}
                commits={commits}
                commitsError={commitsError}
                isCheckingOutWorktree={
                    selected
                        ? checkingOutBranches.has(
                              worktreeActionKey(
                                  selected.project.id,
                                  selected.branch.name,
                              ),
                          )
                        : false
                }
                isLoadingCommits={isLoadingCommits}
                selected={selected}
                onCheckoutBranch={checkoutBranch}
                onReloadCommits={reloadSelectedCommits}
            />
            <AddProjectDialog
                error={addProjectError}
                isOpen={isAddProjectOpen}
                isSubmitting={isAddingProject}
                onClose={() => setIsAddProjectOpen(false)}
                onSubmit={addProject}
            />
            <SshPassphraseDialog
                error={sshPassphraseError}
                isOpen={isSshPassphraseOpen}
                isSubmitting={isSavingSshPassphrase}
                onClose={() => {
                    pendingGitActionRef.current = null;
                    setIsSshPassphraseOpen(false);
                }}
                onSubmit={saveSshPassphrase}
            />
        </Surface>
    );
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}

function errorCode(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : undefined;
}

function errorAction(error: unknown) {
    if (typeof error !== "object" || error === null) {
        return undefined;
    }

    if ("action" in error && (error as { action: unknown }).action) {
        return String((error as { action: unknown }).action);
    }

    if (!("metadata" in error)) {
        return undefined;
    }

    const metadata = (error as { metadata: unknown }).metadata;

    return typeof metadata === "object" &&
        metadata !== null &&
        "action" in metadata &&
        (metadata as { action: unknown }).action
        ? String((metadata as { action: unknown }).action)
        : undefined;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function worktreeActionKey(projectId: string, branchName: string) {
    return `${projectId}:${branchName}`;
}

export default App;
