import { Trash2 } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import {
    Dialog,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPopup,
    DialogTitle,
} from "@/lib/components/ui/dialog";
import type { ScriptInfo } from "@/types/pr-run";

type DeleteCustomActionDialogProps = {
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void;
    pendingDelete: ScriptInfo | null;
};

export function DeleteCustomActionDialog({
    isDeleting,
    onCancel,
    onConfirm,
    pendingDelete,
}: DeleteCustomActionDialogProps) {
    return (
        <Dialog
            open={Boolean(pendingDelete)}
            onOpenChange={(open) => !open && onCancel()}
        >
            <DialogPopup showCloseButton={!isDeleting}>
                <DialogHeader>
                    <DialogTitle>Delete custom action</DialogTitle>
                    <DialogDescription>
                        Delete “{pendingDelete?.title ?? "this action"}” from
                        PR-run? This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button
                        disabled={isDeleting}
                        variant="ghost"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        disabled={isDeleting}
                        variant="destructive"
                        onClick={onConfirm}
                    >
                        <Trash2 className="size-4" />
                        Delete
                    </Button>
                </DialogFooter>
            </DialogPopup>
        </Dialog>
    );
}
