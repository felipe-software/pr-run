import { FolderPlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert } from "@/lib/components/ui/alert";
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
} from "@/lib/components/ui/dialog";
import { Input } from "@/lib/components/ui/input";
import { Label } from "@/lib/components/ui/label";
import { Button } from "@/lib/components/ui/button";

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

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSubmit(projectPath.trim());
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPopup showCloseButton={!isSubmitting}>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex items-start gap-3">
                            <div
                                className="border-border bg-muted/20
                                    text-primary flex size-8 shrink-0
                                    items-center justify-center rounded-md
                                    border"
                            >
                                <FolderPlus className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle>Add project</DialogTitle>
                                <DialogDescription>
                                    Enter the local path of a Git repository.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <DialogPanel className="grid gap-3">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="project-path">Folder path</Label>
                            <Input
                                autoFocus
                                id="project-path"
                                placeholder="/home/user/my-super-app"
                                value={projectPath}
                                onChange={(event) =>
                                    setProjectPath(event.target.value)
                                }
                            />
                        </div>

                        {error ? (
                            <Alert variant="destructive">{error}</Alert>
                        ) : null}
                    </DialogPanel>

                    <DialogFooter>
                        <Button
                            disabled={isSubmitting}
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            disabled={isSubmitting || !projectPath.trim()}
                            type="submit"
                            variant="default"
                        >
                            <FolderPlus className="h-4 w-4" />
                            {isSubmitting ? "Adding..." : "Add"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}
