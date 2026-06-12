import { Card, Input, Label, Surface } from "@heroui/react";
import { FolderPlus, X } from "lucide-react";
import { useState } from "react";
import { AppButton } from "./atoms/AppButton";

type AddProjectDialogProps = {
    isOpen: boolean;
    error?: string;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (projectPath: string) => Promise<void>;
};

export function AddProjectDialog({
    isOpen,
    error,
    isSubmitting,
    onClose,
    onSubmit,
}: AddProjectDialogProps) {
    const [projectPath, setProjectPath] = useState("");

    if (!isOpen) {
        return null;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSubmit(projectPath.trim());
        setProjectPath("");
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
            <Surface className="w-full max-w-lg rounded-lg border border-border bg-background shadow-xl">
                <form className="p-5" onSubmit={handleSubmit}>
                    <Card.Header className="mb-5 px-0 pt-0">
                        <div className="flex items-start gap-3">
                            <FolderPlus className="mt-0.5 h-5 w-5 text-primary" />
                            <div>
                                <Card.Title>Add project</Card.Title>
                                <Card.Description>
                                    Enter the local path of a Git repository.
                                </Card.Description>
                            </div>
                        </div>
                    </Card.Header>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="project-path">Folder path</Label>
                        <Input
                            autoFocus
                            fullWidth
                            id="project-path"
                            placeholder="/home/smart/work/my-super-app"
                            value={projectPath}
                            onChange={(event) =>
                                setProjectPath(event.target.value)
                            }
                        />
                    </div>

                    {error ? (
                        <Surface className="mt-3 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
                            {error}
                        </Surface>
                    ) : null}

                    <div className="mt-6 flex justify-end gap-2">
                        <AppButton
                            isDisabled={isSubmitting}
                            type="button"
                            onPress={onClose}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </AppButton>
                        <AppButton
                            isDisabled={isSubmitting || !projectPath.trim()}
                            tone="primary"
                            type="submit"
                        >
                            <FolderPlus className="h-4 w-4" />
                            {isSubmitting ? "Adding..." : "Add"}
                        </AppButton>
                    </div>
                </form>
            </Surface>
        </div>
    );
}
