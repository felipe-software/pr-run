import { Surface, toast } from "@heroui/react";
import { TerminalSquare } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/lib/components/atoms/button";
import { TerminalPane } from "@/lib/components/molecules/worktree-terminal/terminal-pane";
import { TerminalTabBar } from "@/lib/components/molecules/worktree-terminal/terminal-tab-bar";
import { tryPromise } from "@/lib/error";
import { useWorktreeTerminalStore } from "@/lib/hooks/store/use-worktree-terminal-store";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type WorktreeTerminalProps = {
    ownerKey: string;
    worktreePath: string;
};

export function WorktreeTerminal({
    ownerKey,
    worktreePath,
}: WorktreeTerminalProps) {
    const owner = useWorktreeTerminalStore((state) => state.owners[ownerKey]);
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
        ensureOwner(ownerKey, worktreePath);
        void tryPromise(ensureDefaultTerminal(ownerKey, worktreePath)).then(
            ([error]) => {
                if (error) {
                    toast.danger(getErrorMessage(error), { timeout: 3200 });
                }
            },
        );
    }, [ensureDefaultTerminal, ensureOwner, ownerKey, worktreePath]);

    useEffect(() => {
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
                        window.prRun.getTerminalSessionState(tab.sessionId),
                    );

                    if (error || disposed) {
                        return;
                    }

                    syncTabSnapshot(ownerKey, tab.sessionId, sessionState);
                }),
            );
        }

        void syncTerminalStates();
        const intervalId = window.setInterval(() => {
            void syncTerminalStates();
        }, 500);

        return () => {
            disposed = true;
            window.clearInterval(intervalId);
        };
    }, [ownerKey, syncTabSnapshot]);

    const createManualTerminal = useCallback(async () => {
        const [error] = await tryPromise(
            createTerminal(ownerKey, worktreePath, { type: "manual" }),
        );

        if (error) {
            toast.danger(getErrorMessage(error), { timeout: 3200 });
        }
    }, [createTerminal, ownerKey, worktreePath]);

    const handleCloseTab = useCallback(
        async (tabId: string) => {
            const [error] = await tryPromise(closeTab(ownerKey, tabId));

            if (error) {
                toast.danger(getErrorMessage(error), { timeout: 3200 });
            }
        },
        [closeTab, ownerKey],
    );

    const activeTab = owner?.tabs.find((tab) => tab.id === owner.activeTabId);

    return (
        <section className="flex min-h-0 flex-1 flex-col">
            {owner?.tabs.length ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    <TerminalTabBar
                        activeTabId={owner.activeTabId}
                        tabs={owner.tabs}
                        onCloseTab={(tabId) => void handleCloseTab(tabId)}
                        onCreateTerminal={() => void createManualTerminal()}
                        onSelectTab={(tabId) => setActiveTab(ownerKey, tabId)}
                    />
                    {activeTab ? (
                        <TerminalPane
                            ownerKey={ownerKey}
                            sessionId={activeTab.sessionId}
                            tabId={activeTab.id}
                        />
                    ) : null}
                </div>
            ) : (
                <Surface className="grid min-h-0 flex-1 place-items-center rounded border border-dashed border-border bg-muted/10 px-6 text-center">
                    <div className="flex max-w-sm flex-col items-center gap-3 text-sm text-muted-foreground">
                        <TerminalSquare className="h-6 w-6 text-foreground" />
                        <p>
                            All terminal tabs are closed. Open a new shell or
                            run a script to create another terminal.
                        </p>
                        <Button
                            type="button"
                            onPress={() => void createManualTerminal()}
                        >
                            New terminal
                        </Button>
                    </div>
                </Surface>
            )}
        </section>
    );
}
