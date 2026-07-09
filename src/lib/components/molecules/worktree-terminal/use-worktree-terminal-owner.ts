import { toast } from "@heroui/react";
import { useCallback, useEffect, useRef } from "react";

import { prRunApi } from "@/lib/api";
import { tryPromise } from "@/lib/error";
import { useWorktreeTerminalStore } from "@/lib/hooks/store/use-worktree-terminal-store";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type UseWorktreeTerminalOwnerParams = {
    enabled?: boolean;
    ownerKey: string;
    syncEnabled?: boolean;
    worktreePath: string;
};

export function useWorktreeTerminalOwner({
    enabled = true,
    ownerKey,
    syncEnabled = true,
    worktreePath,
}: UseWorktreeTerminalOwnerParams) {
    const owner = useWorktreeTerminalStore((state) =>
        ownerKey ? state.owners[ownerKey] : undefined,
    );
    const ensureOwner = useWorktreeTerminalStore((state) => state.ensureOwner);
    const ensureDefaultTerminal = useWorktreeTerminalStore(
        (state) => state.ensureDefaultTerminal,
    );
    const createTerminal = useWorktreeTerminalStore(
        (state) => state.createTerminal,
    );
    const closeTab = useWorktreeTerminalStore((state) => state.closeTab);
    const setActiveTab = useWorktreeTerminalStore(
        (state) => state.setActiveTab,
    );
    const syncTabSnapshot = useWorktreeTerminalStore(
        (state) => state.syncTabSnapshot,
    );
    const ownerRef = useRef(owner);

    useEffect(() => {
        ownerRef.current = owner;
    }, [owner]);

    useEffect(() => {
        if (!enabled || !ownerKey || !worktreePath) {
            return;
        }

        ensureOwner(ownerKey, worktreePath);
        tryPromise(ensureDefaultTerminal(ownerKey, worktreePath)).then(
            ([error]) => {
                if (error) {
                    toast.danger(getErrorMessage(error), { timeout: 3200 });
                }
            },
        );
    }, [enabled, ensureDefaultTerminal, ensureOwner, ownerKey, worktreePath]);

    useEffect(() => {
        if (!enabled || !syncEnabled || !ownerKey) {
            return;
        }

        let disposed = false;

        async function syncTerminalStates() {
            const currentOwner = ownerRef.current;

            if (!currentOwner) {
                return;
            }

            const aliveTabs = currentOwner.tabs.filter(
                (tab) => tab.status === "alive",
            );

            await Promise.all(
                aliveTabs.map(async (tab) => {
                    const [error, sessionState] = await tryPromise(
                        prRunApi.getTerminalSessionState(tab.sessionId),
                    );

                    if (error || disposed) {
                        return;
                    }

                    syncTabSnapshot(ownerKey, tab.sessionId, sessionState);
                }),
            );
        }

        syncTerminalStates();
        const intervalId = window.setInterval(() => {
            syncTerminalStates();
        }, 500);

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, [enabled, ownerKey, syncEnabled, syncTabSnapshot]);

    const createManualTerminal = useCallback(async () => {
        const [error] = await tryPromise(
            createTerminal(ownerKey, worktreePath, { type: "manual" }),
        );

        if (error) {
            toast.danger(getErrorMessage(error), { timeout: 3200 });
        }
    }, [createTerminal, ownerKey, worktreePath]);

    const closeTerminalTab = useCallback(
        async (tabId: string) => {
            const [error] = await tryPromise(closeTab(ownerKey, tabId));

            if (error) {
                toast.danger(getErrorMessage(error), { timeout: 3200 });
            }
        },
        [closeTab, ownerKey],
    );

    return {
        closeTerminalTab,
        createManualTerminal,
        owner,
        setActiveTab,
    };
}
