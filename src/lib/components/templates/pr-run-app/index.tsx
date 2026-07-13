import type { CSSProperties } from "react";

import { Surface } from "@/lib/components/atoms/surface";
import { AppDialogs } from "@/lib/components/templates/pr-run-app/app-dialogs";
import { AppInitialState } from "@/lib/components/templates/pr-run-app/app-initial-state";
import { AppWorkspace } from "@/lib/components/templates/pr-run-app/app-workspace";
import { usePrRunAppState } from "@/lib/components/templates/pr-run-app/use-pr-run-app-state";

export function PrRunApp() {
    const state = usePrRunAppState();

    if (state.configError) {
        return <AppInitialState error={state.configError} />;
    }

    if (state.isLoadingConfig) {
        return <AppInitialState isLoading />;
    }

    return (
        <Surface
            className="bg-background text-foreground fixed inset-0 flex min-h-0
                flex-col overflow-hidden rounded-none border-0 font-sans"
            data-slot="sidebar-resize-root"
            style={
                {
                    "--sidebar-width": `${state.sidebarWidth}px`,
                } as CSSProperties
            }
            variant="plain"
        >
            <AppWorkspace
                actionError={state.actionError}
                checkoutBranch={state.checkoutBranch}
                closeSettings={state.closeSettings}
                closeWorktreeTab={state.closeWorktreeTab}
                collapsedProjects={state.collapsedProjects}
                groups={state.groups}
                isCheckingOutWorktree={state.isCheckingOutWorktree}
                openAddProject={state.openAddProject}
                openCreateScript={state.openCreateScript}
                openOverview={state.openOverview}
                openProjectOverview={state.openProjectOverview}
                openSettings={state.openSettings}
                openSshPassphrase={state.openSshPassphrase}
                pendingProjectUpdateId={state.pendingProjectUpdateId}
                pendingWorktreeCheckoutKey={state.pendingWorktreeCheckoutKey}
                pendingWorktreeRemovalKey={state.pendingWorktreeRemovalKey}
                projectAvatarUris={state.projectAvatarUris}
                removeWorktree={state.removeWorktree}
                resizeSidebar={state.resizeSidebar}
                selectedBranchView={state.selectedBranchView}
                selectBranch={state.selectBranch}
                selectWorktreeTab={state.selectWorktreeTab}
                setSettingsSection={state.setSettingsSection}
                statusSummary={state.statusSummary}
                toggleProject={state.toggleProject}
                updateProject={state.updateProject}
                workspaceView={state.workspaceView}
            />
            <AppDialogs
                addProject={{
                    error: state.addProjectError,
                    isOpen: state.isAddProjectOpen,
                    isSubmitting: state.isAddingProject,
                    onClose: state.closeAddProject,
                    onSubmit: state.submitAddProject,
                }}
                createScript={{
                    error: state.createScriptError,
                    isOpen: state.isCreateScriptOpen,
                    isSubmitting: state.isCreatingScript,
                    onClose: state.closeCreateScript,
                    onSubmit: state.createScript,
                }}
            />
        </Surface>
    );
}
