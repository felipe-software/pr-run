import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { AddProjectDialog } from "@/lib/components/templates/add-project-dialog";
import { CreateScriptDialog } from "@/lib/components/templates/create-script-dialog";
import { MainPanel } from "@/lib/components/templates/main-panel";
import { Sidebar } from "@/lib/components/templates/sidebar";
import { SshPassphraseDialog } from "@/lib/components/templates/ssh-passphrase-dialog";
import { usePrRunAppState } from "@/lib/components/templates/pr-run-app/use-pr-run-app-state";

export function PrRunApp() {
    const state = usePrRunAppState();

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
                overflow-hidden rounded-none border-0 font-sans"
            variant="plain"
        >
            <Sidebar
                expandedGroups={state.expandedGroups}
                collapsedProjects={state.collapsedProjects}
                groups={state.groups}
                isCreatingScript={state.isCreatingScript}
                pendingProjectUpdateId={state.pendingProjectUpdateId}
                pendingWorktreeCheckoutKey={state.pendingWorktreeCheckoutKey}
                pendingWorktreeRemovalKey={state.pendingWorktreeRemovalKey}
                selectedBranchName={
                    state.selectedBranchView.branchName ?? undefined
                }
                selectedProjectId={state.selectedBranchView.project?.id}
                sidebarWidth={state.sidebarWidth}
                theme={state.theme}
                onAddProject={state.openAddProject}
                onBeginResize={state.beginResize}
                onCheckoutBranch={state.checkoutBranch}
                onCreateScript={state.openCreateScript}
                onOpenSshPassphrase={state.openSshPassphrase}
                onRemoveWorktree={state.removeWorktree}
                onSelectBranch={state.selectBranch}
                onToggleGroup={state.toggleGroup}
                onToggleProject={state.toggleProject}
                onToggleTheme={() =>
                    state.setTheme((current) =>
                        current === "dark" ? "light" : "dark",
                    )
                }
                onUpdateProject={state.updateProject}
            />
            <MainPanel
                actionError={state.actionError}
                branchName={state.selectedBranchView.branchName}
                isCheckingOutWorktree={state.isCheckingOutWorktree}
                project={state.selectedBranchView.project}
                onCheckoutBranch={state.checkoutBranch}
                onCreateScript={state.openCreateScript}
            />
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
