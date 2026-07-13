import { useEffect, useState } from "react";

import { GlobalTerminalPanel } from "@/lib/components/templates/global-terminal-panel";
import { MainPanel } from "@/lib/components/templates/main-panel";
import { Overview } from "@/lib/components/templates/overview";
import { SettingsPage } from "@/lib/components/templates/settings-page";
import { Sidebar } from "@/lib/components/templates/sidebar";
import { StatusBar } from "@/lib/components/templates/status-bar";
import { WorkspaceTitlebar } from "@/lib/components/templates/workspace-titlebar";
import { useAppHotkeys } from "@/lib/components/templates/pr-run-app/use-app-hotkeys";
import type { usePrRunAppState } from "@/lib/components/templates/pr-run-app/use-pr-run-app-state";
import { useTerminalPanelState } from "@/lib/components/templates/pr-run-app/use-terminal-panel-state";
import {
    cycleWorkspaceTabs,
    useWorkspaceTabsStore,
} from "@/lib/hooks/store/use-workspace-tabs-store";

type AppState = ReturnType<typeof usePrRunAppState>;

type AppWorkspaceProps = Pick<
    AppState,
    | "actionError"
    | "checkoutBranch"
    | "closeSettings"
    | "closeWorktreeTab"
    | "collapsedProjects"
    | "groups"
    | "isCheckingOutWorktree"
    | "openAddProject"
    | "openCreateScript"
    | "openOverview"
    | "openProjectOverview"
    | "openSettings"
    | "openSshPassphrase"
    | "pendingProjectUpdateId"
    | "pendingWorktreeCheckoutKey"
    | "pendingWorktreeRemovalKey"
    | "projectAvatarUris"
    | "removeWorktree"
    | "resizeSidebar"
    | "selectBranch"
    | "selectedBranchView"
    | "selectWorktreeTab"
    | "setSettingsSection"
    | "statusSummary"
    | "toggleProject"
    | "updateProject"
    | "workspaceView"
>;

export function AppWorkspace({
    actionError,
    checkoutBranch,
    closeSettings,
    closeWorktreeTab,
    collapsedProjects,
    groups,
    isCheckingOutWorktree,
    openAddProject,
    openCreateScript,
    openOverview,
    openProjectOverview,
    openSettings,
    openSshPassphrase,
    pendingProjectUpdateId,
    pendingWorktreeCheckoutKey,
    pendingWorktreeRemovalKey,
    projectAvatarUris,
    removeWorktree,
    resizeSidebar,
    selectBranch,
    selectedBranchView,
    selectWorktreeTab,
    setSettingsSection,
    statusSummary,
    toggleProject,
    updateProject,
    workspaceView,
}: AppWorkspaceProps) {
    const terminalPanel = useTerminalPanelState();
    const [isDesktopViewport, setIsDesktopViewport] = useState(
        () => window.matchMedia("(min-width: 64rem)").matches,
    );
    const [isDesktopSidebarHidden, setIsDesktopSidebarHidden] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const isSidebarOpen = isDesktopViewport
        ? !isDesktopSidebarHidden
        : isMobileSidebarOpen;

    useAppHotkeys({
        isBranchWorkspaceVisible: workspaceView.type === "branch",
        onCloseActiveTab: () => {
            const activeTabId = useWorkspaceTabsStore.getState().activeTabId;

            if (activeTabId) {
                closeWorktreeTab(activeTabId);
            }
        },
        onOpenGlobalTerminal: terminalPanel.openGlobalPanel,
        onSelectNextTab: () => selectAdjacentTab("next"),
        onSelectPreviousTab: () => selectAdjacentTab("previous"),
        onToggleSidebar: toggleSidebar,
    });

    useEffect(() => {
        const media = window.matchMedia("(min-width: 64rem)");

        function handleChange(event: MediaQueryListEvent) {
            setIsDesktopViewport(event.matches);
        }

        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, []);

    function selectAdjacentTab(direction: "next" | "previous") {
        const nextTabId = cycleWorkspaceTabs(
            useWorkspaceTabsStore.getState(),
            direction,
        );

        if (nextTabId) {
            selectWorktreeTab(nextTabId);
        }
    }

    function toggleSidebar() {
        if (isDesktopViewport) {
            setIsDesktopSidebarHidden((hidden) => !hidden);
            return;
        }

        setIsMobileSidebarOpen((open) => !open);
    }

    function closeMobileSidebar() {
        if (!isDesktopViewport) {
            setIsMobileSidebarOpen(false);
        }
    }

    return (
        <>
            <WorkspaceTitlebar
                isSidebarOpen={isSidebarOpen}
                projectAvatarUris={projectAvatarUris}
                onCloseTab={closeWorktreeTab}
                onSelectTab={(tabId) => {
                    selectWorktreeTab(tabId);
                    closeMobileSidebar();
                }}
                onToggleSidebar={toggleSidebar}
            />
            <div className="flex min-h-0 flex-1 overflow-hidden">
                <Sidebar
                    busyOwnerKeys={statusSummary.busyOwnerKeys}
                    busyProjectIds={statusSummary.busyProjectIds}
                    collapsedProjects={collapsedProjects}
                    groups={groups}
                    isDesktopHidden={
                        isDesktopViewport && isDesktopSidebarHidden
                    }
                    isMobileOpen={isMobileSidebarOpen}
                    isOverviewActive={workspaceView.type === "overview"}
                    isSettingsActive={workspaceView.type === "settings"}
                    pendingProjectUpdateId={pendingProjectUpdateId}
                    pendingWorktreeCheckoutKey={pendingWorktreeCheckoutKey}
                    pendingWorktreeRemovalKey={pendingWorktreeRemovalKey}
                    projectAvatarUris={projectAvatarUris}
                    selectedBranchName={
                        selectedBranchView.branchName ?? undefined
                    }
                    selectedProjectId={selectedBranchView.project?.id}
                    onCheckoutBranch={checkoutBranch}
                    onOpenAddProject={openAddProject}
                    onOpenOverview={() => {
                        openOverview();
                        closeMobileSidebar();
                    }}
                    onOpenProject={(projectId) => {
                        openProjectOverview(projectId);
                        closeMobileSidebar();
                    }}
                    onOpenSettings={() => {
                        openSettings();
                        closeMobileSidebar();
                    }}
                    onRemoveWorktree={removeWorktree}
                    onResize={resizeSidebar}
                    onSelectBranch={(project, branch) => {
                        selectBranch(project, branch);
                        closeMobileSidebar();
                    }}
                    onToggleProject={toggleProject}
                    onUpdateProject={updateProject}
                />
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    {workspaceView.type === "settings" ? (
                        <SettingsPage
                            groups={groups}
                            section={workspaceView.section}
                            summary={statusSummary}
                            onClose={closeSettings}
                            onCreateScript={openCreateScript}
                            onOpenSshPassphrase={openSshPassphrase}
                            onRefreshProject={updateProject}
                            onSelectSection={setSettingsSection}
                        />
                    ) : workspaceView.type === "overview" ? (
                        <Overview
                            projectId={workspaceView.projectId}
                            projects={groups.flatMap((group) => group.projects)}
                            onProjectChange={(projectId) =>
                                projectId
                                    ? openProjectOverview(projectId)
                                    : openOverview()
                            }
                        />
                    ) : null}
                    {selectedBranchView.project &&
                    selectedBranchView.branchName ? (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <MainPanel
                                actionError={actionError}
                                branchName={selectedBranchView.branchName}
                                isCheckingOutWorktree={isCheckingOutWorktree}
                                isRunTerminalDocked={
                                    terminalPanel.isRunTerminalDocked
                                }
                                isTerminalStateSyncPaused={
                                    terminalPanel.isResizing
                                }
                                project={selectedBranchView.project}
                                onCheckoutBranch={checkoutBranch}
                                onCreateScript={openCreateScript}
                                onRunTerminalContextChange={
                                    terminalPanel.updateRunContext
                                }
                            />
                        </div>
                    ) : workspaceView.type === "branch" ? (
                        <MainPanel
                            actionError={actionError}
                            branchName={null}
                            isCheckingOutWorktree={false}
                            isRunTerminalDocked={false}
                            isTerminalStateSyncPaused={false}
                            project={null}
                            onCheckoutBranch={checkoutBranch}
                            onCreateScript={openCreateScript}
                            onRunTerminalContextChange={
                                terminalPanel.updateRunContext
                            }
                        />
                    ) : null}
                    <GlobalTerminalPanel
                        groups={groups}
                        height={terminalPanel.height}
                        isAutoHeight={terminalPanel.isAutoHeight}
                        isOpen={terminalPanel.isOpen}
                        preferredOwnerKey={terminalPanel.preferredOwnerKey}
                        selectedTerminalKey={terminalPanel.selectedTerminalKey}
                        sidebarWidth={terminalPanel.sidebarWidth}
                        onBeginResize={terminalPanel.beginPanelResize}
                        onBeginSidebarResize={terminalPanel.beginSidebarResize}
                        onClose={terminalPanel.close}
                        onSelectTerminal={terminalPanel.setSelectedTerminalKey}
                    />
                    <StatusBar
                        summary={statusSummary}
                        onOpenBusyTerminals={terminalPanel.openGlobalPanel}
                    />
                </div>
            </div>
        </>
    );
}
