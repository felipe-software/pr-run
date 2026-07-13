import { useCallback, useMemo } from "react";

import { tryPromise } from "@/lib/error";
import { useTerminalSessionMutations } from "@/lib/hooks/query/use-terminal-session-mutations";
import { disposeTerminalTabs } from "@/lib/hooks/terminal-disposal";
import {
    type CreateTerminalReason,
    resolveScriptExecutionMode,
    type RunScriptCommandParams,
    useWorktreeTerminalStore,
    type WorktreeTerminalOwnerKey,
} from "@/lib/hooks/store/use-worktree-terminal-store";

const DEFAULT_TERMINAL_COLS = 80;
const DEFAULT_TERMINAL_ROWS = 24;

export function useWorktreeTerminalActions() {
    const terminalMutations = useTerminalSessionMutations();

    const createTerminal = useCallback(
        async (
            ownerKey: WorktreeTerminalOwnerKey,
            worktreePath: string,
            reason: CreateTerminalReason,
        ) => {
            const session = await terminalMutations.createMutation.mutateAsync({
                cols: DEFAULT_TERMINAL_COLS,
                cwd: worktreePath,
                rows: DEFAULT_TERMINAL_ROWS,
            });

            return useWorktreeTerminalStore
                .getState()
                .addSession(ownerKey, worktreePath, reason, session);
        },
        [terminalMutations.createMutation],
    );

    const ensureDefaultTerminal = useCallback(
        async (ownerKey: WorktreeTerminalOwnerKey, worktreePath: string) => {
            const store = useWorktreeTerminalStore.getState();
            store.ensureOwner(ownerKey, worktreePath);
            const owner = useWorktreeTerminalStore.getState().owners[ownerKey];

            if (
                !owner ||
                owner.tabs.length > 0 ||
                owner.defaultTerminalState !== "idle"
            ) {
                return;
            }

            store.setDefaultTerminalState(ownerKey, worktreePath, "pending");
            const [error] = await tryPromise(
                createTerminal(ownerKey, worktreePath, { type: "default" }),
            );
            useWorktreeTerminalStore
                .getState()
                .setDefaultTerminalState(
                    ownerKey,
                    worktreePath,
                    error ? "idle" : "done",
                );

            if (error) {
                throw error;
            }
        },
        [createTerminal],
    );

    const closeTab = useCallback(
        async (ownerKey: WorktreeTerminalOwnerKey, tabId: string) => {
            const store = useWorktreeTerminalStore.getState();
            const tab = store.owners[ownerKey]?.tabs.find(
                (item) => item.id === tabId,
            );

            if (!tab) {
                return;
            }

            await terminalMutations.disposeMutation.mutateAsync(tab.sessionId);
            useWorktreeTerminalStore.getState().removeTab(ownerKey, tabId);
        },
        [terminalMutations.disposeMutation],
    );

    const disposeOwner = useCallback(
        async (ownerKey: WorktreeTerminalOwnerKey) => {
            const owner = useWorktreeTerminalStore.getState().owners[ownerKey];

            if (!owner) {
                return;
            }

            await disposeTerminalTabs(
                owner.tabs.map((tab) => ({
                    sessionId: tab.sessionId,
                    tabId: tab.id,
                })),
                (sessionId) =>
                    terminalMutations.disposeMutation.mutateAsync(sessionId),
                (tabId) =>
                    useWorktreeTerminalStore
                        .getState()
                        .removeTab(ownerKey, tabId),
            );

            useWorktreeTerminalStore.getState().removeOwner(ownerKey);
        },
        [terminalMutations.disposeMutation],
    );

    const runScriptCommand = useCallback(
        async ({
            command,
            ownerKey,
            scriptTitle,
            worktreePath,
        }: RunScriptCommandParams) => {
            const store = useWorktreeTerminalStore.getState();
            store.ensureOwner(ownerKey, worktreePath);
            const owner = useWorktreeTerminalStore.getState().owners[ownerKey];
            const activeTab = owner?.tabs.find(
                (tab) => tab.id === owner.activeTabId,
            );
            let activeSessionState;

            if (activeTab) {
                const [stateError, sessionState] = await tryPromise(
                    terminalMutations.getSessionState(activeTab.sessionId),
                );

                if (!stateError) {
                    activeSessionState = sessionState;
                    useWorktreeTerminalStore
                        .getState()
                        .syncTabSnapshot(
                            ownerKey,
                            activeTab.sessionId,
                            sessionState,
                        );
                }
            }

            const executionMode = resolveScriptExecutionMode({
                activeSessionState,
                activeTab,
            });
            const targetTab =
                executionMode === "reuse" && activeTab
                    ? activeTab
                    : await createTerminal(ownerKey, worktreePath, {
                          scriptTitle,
                          type: "script",
                      });

            useWorktreeTerminalStore
                .getState()
                .markScriptRunning(ownerKey, targetTab.id, scriptTitle);

            await terminalMutations.writeMutation.mutateAsync({
                data: `${command.replace(/[\r\n]+$/, "")}\r`,
                options: { source: "script" },
                sessionId: targetTab.sessionId,
            });
        },
        [
            createTerminal,
            terminalMutations.getSessionState,
            terminalMutations.writeMutation,
        ],
    );

    return useMemo(
        () => ({
            closeTab,
            createTerminal,
            disposeOwner,
            ensureDefaultTerminal,
            runScriptCommand,
        }),
        [
            closeTab,
            createTerminal,
            disposeOwner,
            ensureDefaultTerminal,
            runScriptCommand,
        ],
    );
}
