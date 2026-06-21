import { Input, Label } from "@heroui/react";
import { KeyRound, X } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { Surface } from "@/lib/components/atoms/surface";
import { saveSshPassphrase } from "@/lib/api";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";

export function SshPassphraseDialog() {
    const { close, error, isOpen, isSaving, passphrase, setPassphrase } =
        useSshPassphraseStore();

    if (!isOpen) {
        return null;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await saveSshPassphrase();
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center
                bg-black/35 px-4"
        >
            <Surface className="w-full max-w-md shadow-xl">
                <form className="p-4" onSubmit={handleSubmit}>
                    <div className="mb-4 flex items-start gap-3">
                        <div
                            className="border-border bg-muted/20 text-primary
                                flex size-8 shrink-0 items-center justify-center
                                rounded-md border"
                        >
                            <KeyRound className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">
                                SSH passphrase
                            </h2>
                            <p className="text-muted-foreground mt-0.5 text-sm">
                                The passphrase stays in backend memory only
                                while the app is open. For automatic usage,
                                install `sshpass` or load the key into
                                `ssh-agent`.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="ssh-passphrase">
                            SSH key passphrase
                        </Label>
                        <Input
                            autoFocus
                            fullWidth
                            id="ssh-passphrase"
                            type="password"
                            value={passphrase}
                            onChange={(event) =>
                                setPassphrase(event.target.value)
                            }
                        />
                    </div>

                    {error ? (
                        <Surface
                            className="mt-3 px-3 py-2 text-sm"
                            variant="danger"
                        >
                            {error}
                        </Surface>
                    ) : null}

                    <div className="mt-5 flex justify-end gap-2">
                        <Button
                            isDisabled={isSaving}
                            type="button"
                            variant="ghost"
                            onPress={close}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            isDisabled={isSaving || !passphrase}
                            type="submit"
                            variant="primary"
                        >
                            <KeyRound className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </form>
            </Surface>
        </div>
    );
}
