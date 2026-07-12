import { AddProjectDialog } from "@/lib/components/templates/add-project-dialog";
import { CreateScriptDialog } from "@/lib/components/templates/create-script-dialog";
import { SshPassphraseDialog } from "@/lib/components/templates/ssh-passphrase-dialog";
import type { usePrRunAppState } from "@/lib/components/templates/pr-run-app/use-pr-run-app-state";

type AppDialogsProps = {
    state: ReturnType<typeof usePrRunAppState>;
};

export function AppDialogs({ state }: AppDialogsProps) {
    return (
        <>
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
        </>
    );
}
