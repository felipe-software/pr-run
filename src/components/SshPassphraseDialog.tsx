import { Card, Input, Label, Surface } from "@heroui/react";
import { KeyRound, X } from "lucide-react";
import { AppButton } from "./atoms/AppButton";
import { saveSshPassphrase } from "../lib/api";
import { useSshPassphraseStore } from "../store/ssh-passphrase";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
            <Surface className="w-full max-w-md rounded-lg border border-border bg-background shadow-xl">
                <form className="p-5" onSubmit={handleSubmit}>
                    <Card.Header className="mb-5 px-0 pt-0">
                        <div className="flex items-start gap-3">
                            <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
                            <div>
                                <Card.Title>SSH passphrase</Card.Title>
                                <Card.Description>
                                    The passphrase stays in backend memory only
                                    while the app is open. For automatic usage,
                                    install `sshpass` or load the key into
                                    `ssh-agent`.
                                </Card.Description>
                            </div>
                        </div>
                    </Card.Header>

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
                        <Surface className="mt-3 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
                            {error}
                        </Surface>
                    ) : null}

                    <div className="mt-6 flex justify-end gap-2">
                        <AppButton
                            isDisabled={isSaving}
                            type="button"
                            onPress={close}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </AppButton>
                        <AppButton
                            isDisabled={isSaving || !passphrase}
                            tone="primary"
                            type="submit"
                        >
                            <KeyRound className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Save"}
                        </AppButton>
                    </div>
                </form>
            </Surface>
        </div>
    );
}
