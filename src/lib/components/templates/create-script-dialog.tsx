import { FilePlus2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert } from "@/lib/components/ui/alert";
import { Button } from "@/lib/components/ui/button";
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

type CreateScriptDialogProps = {
    error?: string;
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (title: string) => Promise<void>;
};

export function CreateScriptDialog({
    error,
    isOpen,
    isSubmitting,
    onClose,
    onSubmit,
}: CreateScriptDialogProps) {
    const [title, setTitle] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setTitle("");
        }
    }, [isOpen]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSubmit(title.trim());
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
                                <FilePlus2 className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle>Create script</DialogTitle>
                                <DialogDescription>
                                    Create a global TypeScript script available
                                    to every project.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <DialogPanel className="grid gap-3">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="script-title">Title</Label>
                            <Input
                                autoFocus
                                id="script-title"
                                placeholder="Run Expo"
                                value={title}
                                onChange={(event) =>
                                    setTitle(event.target.value)
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
                            disabled={isSubmitting || !title.trim()}
                            type="submit"
                            variant="default"
                        >
                            <FilePlus2 className="h-4 w-4" />
                            {isSubmitting ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}
