import { AddProjectDialog } from "@/lib/components/templates/add-project-dialog";
import { CreateScriptDialog } from "@/lib/components/templates/create-script-dialog";
import { SshPassphraseDialog } from "@/lib/components/templates/ssh-passphrase-dialog";

type AppDialogsProps = {
    addProject: {
        error?: string;
        isOpen: boolean;
        isSubmitting: boolean;
        onClose: () => void;
        onSubmit: (projectPath: string) => Promise<void>;
    };
    createScript: {
        error?: string;
        isOpen: boolean;
        isSubmitting: boolean;
        onClose: () => void;
        onSubmit: (title: string) => Promise<void>;
    };
};

export function AppDialogs({ addProject, createScript }: AppDialogsProps) {
    return (
        <>
            <AddProjectDialog {...addProject} />
            <CreateScriptDialog {...createScript} />
            <SshPassphraseDialog />
        </>
    );
}
