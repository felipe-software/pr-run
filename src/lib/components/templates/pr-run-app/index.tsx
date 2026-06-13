import { Card, Spinner, Surface } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

import { AddProjectDialog } from "@/lib/components/templates/add-project-dialog";
import { MainPanel } from "@/lib/components/templates/main-panel";
import { Sidebar } from "@/lib/components/templates/sidebar";
import { SshPassphraseDialog } from "@/lib/components/templates/ssh-passphrase-dialog";
import { usePrRunAppState } from "@/lib/components/templates/pr-run-app/use-pr-run-app-state";

export function PrRunApp() {
    const state = usePrRunAppState();

    if (state.configError) {
        return (
            <div className="grid h-screen place-items-center overflow-hidden bg-background p-8 text-foreground">
                <Card className="max-w-lg rounded-lg border border-danger/25 bg-danger/10 text-danger">
                    <Card.Content className="flex gap-3 p-5">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <span>{state.configError}</span>
                    </Card.Content>
                </Card>
            </div>
        );
    }

    if (state.isLoadingConfig) {
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
                expandedGroups={state.expandedGroups}
                expandedProjects={state.expandedProjects}
                groups={state.groups}
                pendingProjectUpdateId={state.pendingProjectUpdateId}
                pendingWorktreeRemovalKey={state.pendingWorktreeRemovalKey}
                selectedBranchName={
                    state.selectedBranchView.branchName ?? undefined
                }
                selectedProjectId={state.selectedBranchView.project?.id}
                sidebarWidth={state.sidebarWidth}
                theme={state.theme}
                onAddProject={state.openAddProject}
                onBeginResize={state.beginResize}
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
            />
            <AddProjectDialog
                error={state.addProjectError}
                isOpen={state.isAddProjectOpen}
                isSubmitting={state.isAddingProject}
                onClose={state.closeAddProject}
                onSubmit={state.submitAddProject}
            />
            <SshPassphraseDialog />
        </Surface>
    );
}
