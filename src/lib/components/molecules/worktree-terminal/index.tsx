import { toast } from "@heroui/react";
import { TerminalSquare } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/lib/components/atoms/button";
import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Surface } from "@/lib/components/atoms/surface";
import { TerminalPane } from "@/lib/components/molecules/worktree-terminal/terminal-pane";
import { TerminalTabBar } from "@/lib/components/molecules/worktree-terminal/terminal-tab-bar";
import { prRunApi } from "@/lib/api";
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
        tryPromise(ensureDefaultTerminal(ownerKey, worktreePath)).then(
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
                        onCloseTab={(tabId) => {
                            handleCloseTab(tabId);
                        }}
                        onCreateTerminal={() => {
                            createManualTerminal();
                        }}
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
                <Surface className="min-h-0 flex-1" variant="muted">
                    <EmptyState
                        actions={
                            <Button
                                type="button"
                                variant="outline"
                                onPress={() => {
                                    createManualTerminal();
                                }}
                            >
                                New terminal
                            </Button>
                        }
                        description="Open a new shell or run a script to create another terminal."
                        icon={<TerminalSquare className="h-4 w-4" />}
                        title="All terminal tabs are closed"
                    />
                </Surface>
            )}
        </section>
    );
}
