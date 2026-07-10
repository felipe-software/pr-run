import { KeyRound, Trash2 } from "lucide-react";

import { prRunApi } from "@/lib/api";
import { Button } from "@/lib/components/ui/button";
import { toast } from "@/lib/components/ui/toast";
import { tryPromise } from "@/lib/error";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { SettingsSection } from "@/lib/components/templates/settings-page/appearance-settings";

export function SshSettings({ onOpen }: { onOpen: () => void }) {
    async function clear() {
        const [error] = await tryPromise(prRunApi.clearSshPassphrase());
        if (error) {
            toast.error(getErrorMessage(error));
            return;
        }
        toast.success("SSH passphrase cleared.");
    }

    return (
        <SettingsSection
            description="The passphrase is stored only in backend memory while PR Run is open."
            title="SSH"
        >
            <div className="flex flex-wrap gap-2">
                <Button onClick={onOpen}>
                    <KeyRound className="size-3.5" />
                    Update passphrase
                </Button>
                <Button variant="destructive-outline" onClick={clear}>
                    <Trash2 className="size-3.5" />
                    Clear passphrase
                </Button>
            </div>
        </SettingsSection>
    );
}
