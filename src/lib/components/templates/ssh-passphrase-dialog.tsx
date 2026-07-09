import { KeyRound, X } from "lucide-react";

import { saveSshPassphrase } from "@/lib/api";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
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

export function SshPassphraseDialog() {
    const { close, error, isOpen, isSaving, passphrase, setPassphrase } =
        useSshPassphraseStore();

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await saveSshPassphrase();
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
            <DialogPopup showCloseButton={!isSaving}>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <div className="flex items-start gap-3">
                            <div
                                className="border-border bg-muted/20
                                    text-primary flex size-8 shrink-0
                                    items-center justify-center rounded-md
                                    border"
                            >
                                <KeyRound className="h-4 w-4" />
                            </div>
                            <div>
                                <DialogTitle>SSH passphrase</DialogTitle>
                                <DialogDescription>
                                    The passphrase stays in backend memory only
                                    while the app is open. For automatic usage,
                                    install `sshpass` or load the key into
                                    `ssh-agent`.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <DialogPanel className="grid gap-3">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="ssh-passphrase">
                                SSH key passphrase
                            </Label>
                            <Input
                                autoFocus
                                id="ssh-passphrase"
                                type="password"
                                value={passphrase}
                                onChange={(event) =>
                                    setPassphrase(event.target.value)
                                }
                            />
                        </div>

                        {error ? (
                            <Alert variant="destructive">{error}</Alert>
                        ) : null}
                    </DialogPanel>

                    <DialogFooter>
                        <Button
                            disabled={isSaving}
                            type="button"
                            variant="ghost"
                            onClick={close}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            disabled={isSaving || !passphrase}
                            type="submit"
                            variant="default"
                        >
                            <KeyRound className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogPopup>
        </Dialog>
    );
}
