import { AlertTriangle } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { AddProjectDialog } from "@/lib/components/templates/add-project-dialog";
import { CreateScriptDialog } from "@/lib/components/templates/create-script-dialog";
import {
    getTerminalKey,
    GlobalTerminalPanel,
} from "@/lib/components/templates/global-terminal-panel";
import { MainPanel } from "@/lib/components/templates/main-panel";
import { Overview } from "@/lib/components/templates/overview";
import type { RunTerminalContext } from "@/lib/components/templates/main-panel";
import { Sidebar } from "@/lib/components/templates/sidebar";
import { SshPassphraseDialog } from "@/lib/components/templates/ssh-passphrase-dialog";
import { StatusBar } from "@/lib/components/templates/status-bar";
import { WorkspaceTitlebar } from "@/lib/components/templates/workspace-titlebar";
import { SettingsPage } from "@/lib/components/templates/settings-page";
import { usePrRunAppState } from "@/lib/components/templates/pr-run-app/use-pr-run-app-state";
import { useWorktreeTerminalStore } from "@/lib/hooks/store/use-worktree-terminal-store";

const TERMINAL_PANEL_DEFAULT_HEIGHT = 320;
const TERMINAL_PANEL_MIN_HEIGHT = 180;
const TERMINAL_PANEL_SIDEBAR_DEFAULT_WIDTH = 180;
const TERMINAL_PANEL_SIDEBAR_MIN_WIDTH = 132;
const TERMINAL_PANEL_SIDEBAR_MAX_WIDTH = 360;
const TERMINAL_RESIZE_BUSY_SYNC_DELAY_MS = 800;

export function PrRunApp() {
    const state = usePrRunAppState();
    const terminalOwners = useWorktreeTerminalStore((store) => store.owners);
    const [isDesktopViewport, setIsDesktopViewport] = useState(
        () => window.matchMedia("(min-width: 64rem)").matches,
    );
    const [isDesktopSidebarHidden, setIsDesktopSidebarHidden] = useState(false);
    const [isTerminalPanelOpen, setIsTerminalPanelOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isTerminalPanelAutoHeight, setIsTerminalPanelAutoHeight] =
        useState(false);
    const [isTerminalPanelResizing, setIsTerminalPanelResizing] =
        useState(false);
    const [terminalPanelHeight, setTerminalPanelHeight] = useState(() =>
        readPersistedSize(
            "pr-run:terminal-panel-height",
            TERMINAL_PANEL_DEFAULT_HEIGHT,
        ),
    );
    const [terminalPanelSidebarWidth, setTerminalPanelSidebarWidth] = useState(
        () =>
            readPersistedSize(
                "pr-run:terminal-list-width",
                TERMINAL_PANEL_SIDEBAR_DEFAULT_WIDTH,
            ),
    );
    const [selectedGlobalTerminalKey, setSelectedGlobalTerminalKey] = useState<
        string | null
    >(null);
    const [runTerminalContext, setRunTerminalContext] =
        useState<RunTerminalContext | null>(null);
    const resizeSettleTimeoutRef = useRef<number | null>(null);
    const preferredGlobalTerminalKey = useMemo(
        () => getPreferredGlobalTerminalKey(terminalOwners),
        [terminalOwners],
    );
    const runTerminalKey = useMemo(
        () =>
            runTerminalContext
                ? getActiveOwnerTerminalKey(
                      terminalOwners,
                      runTerminalContext.ownerKey,
                  )
                : null,
        [runTerminalContext, terminalOwners],
    );
    const isSidebarOpen = isDesktopViewport
        ? !isDesktopSidebarHidden
        : isMobileSidebarOpen;

    useEffect(() => {
        const media = window.matchMedia("(min-width: 64rem)");

        function handleChange(event: MediaQueryListEvent) {
            setIsDesktopViewport(event.matches);
        }

        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        if (!runTerminalContext) {
            setIsTerminalPanelAutoHeight(false);
            setIsTerminalPanelOpen(false);
            return;
        }

        setIsTerminalPanelAutoHeight(true);
        setIsTerminalPanelOpen(true);
    }, [runTerminalContext]);

    useEffect(() => {
        if (!runTerminalContext || !runTerminalKey) {
            return;
        }

        setSelectedGlobalTerminalKey(runTerminalKey);
    }, [runTerminalContext, runTerminalKey]);

    const handleRunTerminalContextChange = useCallback(
        (context: RunTerminalContext | null) => {
            setRunTerminalContext(context);
        },
        [],
    );

    useEffect(() => {
        return () => {
            if (resizeSettleTimeoutRef.current !== null) {
                window.clearTimeout(resizeSettleTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(
            "pr-run:terminal-panel-height",
            String(terminalPanelHeight),
        );
    }, [terminalPanelHeight]);

    useEffect(() => {
        localStorage.setItem(
            "pr-run:terminal-list-width",
            String(terminalPanelSidebarWidth),
        );
    }, [terminalPanelSidebarWidth]);

    function beginTerminalUiResize() {
        if (resizeSettleTimeoutRef.current !== null) {
            window.clearTimeout(resizeSettleTimeoutRef.current);
            resizeSettleTimeoutRef.current = null;
        }

        setIsTerminalPanelResizing(true);
    }

    function finishTerminalUiResize() {
        if (resizeSettleTimeoutRef.current !== null) {
            window.clearTimeout(resizeSettleTimeoutRef.current);
        }

        resizeSettleTimeoutRef.current = window.setTimeout(() => {
            resizeSettleTimeoutRef.current = null;
            setIsTerminalPanelResizing(false);
        }, TERMINAL_RESIZE_BUSY_SYNC_DELAY_MS);
    }

    function openGlobalTerminalPanel() {
        setIsTerminalPanelAutoHeight(false);
        setSelectedGlobalTerminalKey(
            (current) => current ?? preferredGlobalTerminalKey,
        );
        setIsTerminalPanelOpen(true);
    }

    function toggleSidebar() {
        if (isDesktopViewport) {
            setIsDesktopSidebarHidden((hidden) => !hidden);
            return;
        }

        setIsMobileSidebarOpen((open) => !open);
    }

    function beginTerminalPanelResize(
        event: ReactPointerEvent<HTMLDivElement>,
        startHeightOverride?: number,
    ) {
        event.preventDefault();
        beginTerminalUiResize();

        const startY = event.clientY;
        const startHeight =
            startHeightOverride ??
            event.currentTarget.parentElement?.getBoundingClientRect().height ??
            terminalPanelHeight;
        const initialHeight = Math.max(startHeight, TERMINAL_PANEL_MIN_HEIGHT);

        setTerminalPanelHeight(initialHeight);
        setIsTerminalPanelAutoHeight(false);

        function handlePointerMove(moveEvent: PointerEvent) {
            setTerminalPanelHeight(
                Math.max(
                    initialHeight + startY - moveEvent.clientY,
                    TERMINAL_PANEL_MIN_HEIGHT,
                ),
            );
        }

        function handlePointerUp() {
            finishTerminalUiResize();
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
    }

    function beginTerminalPanelSidebarResize(
        event: ReactPointerEvent<HTMLDivElement>,
    ) {
        event.preventDefault();
        beginTerminalUiResize();

        const startX = event.clientX;
        const startWidth = terminalPanelSidebarWidth;

        function handlePointerMove(moveEvent: PointerEvent) {
            setTerminalPanelSidebarWidth(
                clamp(
                    startWidth + startX - moveEvent.clientX,
                    TERMINAL_PANEL_SIDEBAR_MIN_WIDTH,
                    TERMINAL_PANEL_SIDEBAR_MAX_WIDTH,
                ),
            );
        }

        function handlePointerUp() {
            finishTerminalUiResize();
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);
    }

    if (state.configError) {
        return (
            <div
                className="bg-background text-foreground fixed inset-0 grid
                    place-items-center overflow-hidden p-8 font-sans"
            >
                <Surface
                    className="max-w-lg px-4 py-3 text-sm"
                    variant="danger"
                >
                    <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{state.configError}</span>
                    </div>
                </Surface>
            </div>
        );
    }

    if (state.isLoadingConfig) {
        return (
            <Surface
                className="bg-background fixed inset-0 grid place-items-center
                    overflow-hidden rounded-none border-0 font-sans"
                variant="plain"
            >
                <EmptyState
                    description="Loading projects, branches, and saved scripts."
                    icon={<Skeleton className="size-4 rounded-sm" />}
                    title="Opening PR Run"
                />
            </Surface>
        );
    }

    return (
        <Surface
            className="bg-background text-foreground fixed inset-0 flex min-h-0
                flex-col overflow-hidden rounded-none border-0 font-sans"
            variant="plain"
        >
            <WorkspaceTitlebar
                isSidebarOpen={isSidebarOpen}
                sidebarWidth={state.sidebarWidth}
                onCloseTab={state.closeWorktreeTab}
                onSelectTab={state.selectWorktreeTab}
                onToggleSidebar={toggleSidebar}
            />
            <div className="flex min-h-0 flex-1 overflow-hidden">
                <Sidebar
                    busyOwnerKeys={state.statusSummary.busyOwnerKeys}
                    busyProjectIds={state.statusSummary.busyProjectIds}
                    expandedGroups={state.expandedGroups}
                    collapsedProjects={state.collapsedProjects}
                    groups={state.groups}
                    isDesktopHidden={
                        isDesktopViewport && isDesktopSidebarHidden
                    }
                    isMobileOpen={isMobileSidebarOpen}
                    isOverviewActive={state.isOverviewOpen}
                    pendingProjectUpdateId={state.pendingProjectUpdateId}
                    pendingWorktreeCheckoutKey={
                        state.pendingWorktreeCheckoutKey
                    }
                    pendingWorktreeRemovalKey={state.pendingWorktreeRemovalKey}
                    selectedBranchName={
                        state.selectedBranchView.branchName ?? undefined
                    }
                    selectedProjectId={state.selectedBranchView.project?.id}
                    sidebarWidth={state.sidebarWidth}
                    onBeginResize={state.beginResize}
                    onCheckoutBranch={state.checkoutBranch}
                    onOpenOverview={state.openOverview}
                    onRemoveWorktree={state.removeWorktree}
                    onSelectBranch={state.selectBranch}
                    onToggleGroup={state.toggleGroup}
                    onToggleProject={state.toggleProject}
                    onUpdateProject={state.updateProject}
                />
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    {state.workspaceView.type === "settings" ? (
                        <SettingsPage
                            groups={state.groups}
                            section={state.workspaceView.section}
                            summary={state.statusSummary}
                            onClose={state.closeSettings}
                            onCreateScript={state.openCreateScript}
                            onOpenSshPassphrase={state.openSshPassphrase}
                            onRefreshProject={state.updateProject}
                            onSelectSection={state.setSettingsSection}
                        />
                    ) : state.isOverviewOpen ? (
                        <Overview
                            projects={state.groups.flatMap(
                                (group) => group.projects,
                            )}
                        />
                    ) : (
                        <>
                            <MainPanel
                                actionError={state.actionError}
                                branchName={state.selectedBranchView.branchName}
                                isRunTerminalDocked={Boolean(
                                    runTerminalContext &&
                                    isTerminalPanelOpen &&
                                    isTerminalPanelAutoHeight,
                                )}
                                isTerminalStateSyncPaused={
                                    isTerminalPanelResizing
                                }
                                isCheckingOutWorktree={
                                    state.isCheckingOutWorktree
                                }
                                project={state.selectedBranchView.project}
                                onCheckoutBranch={state.checkoutBranch}
                                onCreateScript={state.openCreateScript}
                                onRunTerminalContextChange={
                                    handleRunTerminalContextChange
                                }
                            />
                            <GlobalTerminalPanel
                                groups={state.groups}
                                height={terminalPanelHeight}
                                isAutoHeight={isTerminalPanelAutoHeight}
                                isOpen={isTerminalPanelOpen}
                                preferredOwnerKey={
                                    runTerminalContext?.ownerKey ?? null
                                }
                                sidebarWidth={terminalPanelSidebarWidth}
                                selectedTerminalKey={selectedGlobalTerminalKey}
                                onBeginSidebarResize={
                                    beginTerminalPanelSidebarResize
                                }
                                onBeginResize={beginTerminalPanelResize}
                                onClose={() => setIsTerminalPanelOpen(false)}
                                onSelectTerminal={setSelectedGlobalTerminalKey}
                            />
                        </>
                    )}
                    <StatusBar
                        summary={state.statusSummary}
                        onOpenBusyTerminals={openGlobalTerminalPanel}
                    />
                </div>
            </div>
            <AddProjectDialog
                error={state.addProjectError}
                isOpen={state.isAddProjectOpen}
                isSubmitting={state.isAddingProject}
                onClose={state.closeAddProject}
                onSubmit={state.submitAddProject}
            />
            <CreateScriptDialog
                error={state.createScriptError}
                isOpen={state.isCreateScriptOpen}
                isSubmitting={state.isCreatingScript}
                onClose={state.closeCreateScript}
                onSubmit={state.createScript}
            />
            <SshPassphraseDialog />
        </Surface>
    );
}

function getPreferredGlobalTerminalKey(
    owners: ReturnType<typeof useWorktreeTerminalStore.getState>["owners"],
) {
    const fallback = getFirstTerminalKey(owners);

    for (const [ownerKey, owner] of Object.entries(owners)) {
        const busyTab = owner.tabs.find(
            (tab) => tab.status === "alive" && tab.busyState === "busy",
        );

        if (busyTab) {
            return getTerminalKey(ownerKey, busyTab.id);
        }
    }

    return fallback;
}

function getFirstTerminalKey(
    owners: ReturnType<typeof useWorktreeTerminalStore.getState>["owners"],
) {
    for (const [ownerKey, owner] of Object.entries(owners)) {
        const firstTab = owner.tabs[0];

        if (firstTab) {
            return getTerminalKey(ownerKey, firstTab.id);
        }
    }

    return null;
}

function getActiveOwnerTerminalKey(
    owners: ReturnType<typeof useWorktreeTerminalStore.getState>["owners"],
    ownerKey: string,
) {
    const owner = owners[ownerKey];

    if (!owner) {
        return null;
    }

    const activeTab =
        owner.tabs.find((tab) => tab.id === owner.activeTabId) ?? owner.tabs[0];

    return activeTab ? getTerminalKey(ownerKey, activeTab.id) : null;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function readPersistedSize(key: string, fallback: number) {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : fallback;
}
