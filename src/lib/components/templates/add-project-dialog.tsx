import { Input, Label } from "@heroui/react";
import { FolderPlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/lib/components/atoms/button";
import { Surface } from "@/lib/components/atoms/surface";

type AddProjectDialogProps = {
    error?: string;
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (projectPath: string) => Promise<void>;
};

export function AddProjectDialog({
    error,
    isOpen,
    isSubmitting,
    onClose,
    onSubmit,
}: AddProjectDialogProps) {
    const [projectPath, setProjectPath] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setProjectPath("");
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSubmit(projectPath.trim());
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
            <Surface className="w-full max-w-lg shadow-xl">
                <form className="p-4" onSubmit={handleSubmit}>
                    <div className="mb-4 flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/20 text-primary">
                            <FolderPlus className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">
                                Add project
                            </h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Enter the local path of a Git repository.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="project-path">Folder path</Label>
                        <Input
                            autoFocus
                            fullWidth
                            id="project-path"
                            placeholder="/home/user/my-super-app"
                            value={projectPath}
                            onChange={(event) =>
                                setProjectPath(event.target.value)
                            }
                        />
                    </div>

                    {error ? (
                        <Surface className="mt-3 px-3 py-2 text-sm" variant="danger">
                            {error}
                        </Surface>
                    ) : null}

                    <div className="mt-5 flex justify-end gap-2">
                        <Button
                            isDisabled={isSubmitting}
                            type="button"
                            variant="ghost"
                            onPress={onClose}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            isDisabled={isSubmitting || !projectPath.trim()}
                            type="submit"
                            variant="primary"
                        >
                            <FolderPlus className="h-4 w-4" />
                            {isSubmitting ? "Adding..." : "Add"}
                        </Button>
                    </div>
                </form>
            </Surface>
        </div>
    );
}
