import { create } from "zustand";

import { prRunApi } from "@/lib/api";
import { tryPromise } from "@/lib/error";
import type {
    TerminalBusyState,
    TerminalSessionSnapshot,
} from "@/types/pr-run";

const DEFAULT_TERMINAL_COLS = 80;
const DEFAULT_TERMINAL_ROWS = 24;

export type WorktreeTerminalOwnerKey = string;

export type WorktreeTerminalTabStatus = "alive" | "exited";

export type WorktreeTerminalTab = {
    id: string;
    sessionId: string;
    label: string;
    status: WorktreeTerminalTabStatus;
    busyState: TerminalBusyState;
    hasManualInput: boolean;
    shellName: string;
    scriptTitleOverride?: string;
};

export type WorktreeTerminalOwnerState = {
    activeTabId: string | null;
    defaultTerminalState: "idle" | "pending" | "done";
    nextScriptLabelCounts: Record<string, number>;
    nextTerminalNumber: number;
    tabs: WorktreeTerminalTab[];
    worktreePath: string;
};

export type BusyTerminalSummary = {
    busyOwnerKeys: Set<WorktreeTerminalOwnerKey>;
    busyProjectIds: Set<string>;
    busyTerminalCount: number;
};

type CreateTerminalReason =
    | { type: "default" | "manual" }
    | { type: "script"; scriptTitle: string };

type RunScriptCommandParams = {
    command: string;
    ownerKey: WorktreeTerminalOwnerKey;
    scriptTitle: string;
    worktreePath: string;
};

type WorktreeTerminalStoreState = {
    owners: Record<WorktreeTerminalOwnerKey, WorktreeTerminalOwnerState>;
    closeTab: (
        ownerKey: WorktreeTerminalOwnerKey,
        tabId: string,
    ) => Promise<void>;
    createTerminal: (
        ownerKey: WorktreeTerminalOwnerKey,
        worktreePath: string,
        reason: CreateTerminalReason,
    ) => Promise<WorktreeTerminalTab>;
    disposeOwner: (ownerKey: WorktreeTerminalOwnerKey) => Promise<void>;
    ensureDefaultTerminal: (
        ownerKey: WorktreeTerminalOwnerKey,
        worktreePath: string,
    ) => Promise<void>;
    ensureOwner: (
        ownerKey: WorktreeTerminalOwnerKey,
        worktreePath: string,
    ) => void;
    markManualInput: (
        ownerKey: WorktreeTerminalOwnerKey,
        tabId: string,
    ) => void;
    syncTabSnapshot: (
        ownerKey: WorktreeTerminalOwnerKey,
        sessionId: string,
        snapshot: Pick<
            TerminalSessionSnapshot,
            "busyState" | "currentProcess" | "id" | "isAlive"
        >,
    ) => void;
    runScriptCommand: (params: RunScriptCommandParams) => Promise<void>;
    setActiveTab: (ownerKey: WorktreeTerminalOwnerKey, tabId: string) => void;
};

export function getWorktreeOwnerKey(projectId: string, branchName: string) {
    return `${projectId}:${branchName}`;
}

export function createWorktreeTerminalOwnerState(
    worktreePath: string,
): WorktreeTerminalOwnerState {
    return {
        activeTabId: null,
        defaultTerminalState: "idle",
        nextScriptLabelCounts: {},
        nextTerminalNumber: 1,
        tabs: [],
        worktreePath,
    };
}

export function appendWorktreeTerminalTab(
    owner: WorktreeTerminalOwnerState,
    tab: WorktreeTerminalTab,
) {
    return {
        ...owner,
        activeTabId: tab.id,
        tabs: [...owner.tabs, tab],
    };
}

export function removeWorktreeTerminalTab(
    owner: WorktreeTerminalOwnerState,
    tabId: string,
) {
    const index = owner.tabs.findIndex((tab) => tab.id === tabId);

    if (index === -1) {
        return owner;
    }

    const tabs = owner.tabs.filter((tab) => tab.id !== tabId);
    const activeTabId =
        owner.activeTabId !== tabId
            ? owner.activeTabId
            : (tabs[index - 1]?.id ?? tabs[index]?.id ?? null);

    return {
        ...owner,
        activeTabId,
        tabs,
    };
}

export function getBusyTerminalSummary(
    owners: Record<WorktreeTerminalOwnerKey, WorktreeTerminalOwnerState>,
): BusyTerminalSummary {
    const busyOwnerKeys = new Set<WorktreeTerminalOwnerKey>();
    const busyProjectIds = new Set<string>();
    let busyTerminalCount = 0;

    for (const [ownerKey, owner] of Object.entries(owners)) {
        const busyTabCount = owner.tabs.filter(
            (tab) => tab.status === "alive" && tab.busyState === "busy",
        ).length;

        if (busyTabCount === 0) {
            continue;
        }

        busyTerminalCount += busyTabCount;
        busyOwnerKeys.add(ownerKey);

        const projectId = ownerKey.split(":")[0];

        if (projectId) {
            busyProjectIds.add(projectId);
        }
    }

    return {
        busyOwnerKeys,
        busyProjectIds,
        busyTerminalCount,
    };
}

export function resolveScriptExecutionMode(params: {
    activeTab?: WorktreeTerminalTab;
    activeSessionState?: Pick<TerminalSessionSnapshot, "busyState" | "isAlive">;
}) {
    if (
        params.activeTab &&
        params.activeTab.status === "alive" &&
        params.activeSessionState?.isAlive &&
        params.activeSessionState.busyState === "idle"
    ) {
        return "reuse";
    }

    return "create";
}

export const useWorktreeTerminalStore = create<WorktreeTerminalStoreState>(
    (set, get) => ({
        owners: {},
        ensureOwner(ownerKey, worktreePath) {
            set((state) => ({
                owners: {
                    ...state.owners,
                    [ownerKey]: state.owners[ownerKey]
                        ? {
                              ...state.owners[ownerKey],
                              worktreePath,
                          }
                        : createWorktreeTerminalOwnerState(worktreePath),
                },
            }));
        },
        async ensureDefaultTerminal(ownerKey, worktreePath) {
            get().ensureOwner(ownerKey, worktreePath);
            const owner = get().owners[ownerKey];

            if (
                !owner ||
                owner.tabs.length > 0 ||
                owner.defaultTerminalState !== "idle"
            ) {
                return;
            }

            set((state) => ({
                owners: {
                    ...state.owners,
                    [ownerKey]: state.owners[ownerKey]
                        ? {
                              ...state.owners[ownerKey],
                              defaultTerminalState: "pending",
                          }
                        : createWorktreeTerminalOwnerState(worktreePath),
                },
            }));

            const [error] = await tryPromise(
                get().createTerminal(ownerKey, worktreePath, {
                    type: "default",
                }),
            );

            set((state) => ({
                owners: {
                    ...state.owners,
                    [ownerKey]: state.owners[ownerKey]
                        ? {
                              ...state.owners[ownerKey],
                              defaultTerminalState: error ? "idle" : "done",
                          }
                        : createWorktreeTerminalOwnerState(worktreePath),
                },
            }));

            if (error) {
                throw error;
            }
        },
        async createTerminal(ownerKey, worktreePath, reason) {
            get().ensureOwner(ownerKey, worktreePath);
            const [error, session] = await tryPromise(
                prRunApi.createTerminalSession({
                    cwd: worktreePath,
                    cols: DEFAULT_TERMINAL_COLS,
                    rows: DEFAULT_TERMINAL_ROWS,
                }),
            );

            if (error) {
                throw error;
            }

            let createdTab: WorktreeTerminalTab | null = null;

            set((state) => {
                const owner =
                    state.owners[ownerKey] ??
                    createWorktreeTerminalOwnerState(worktreePath);
                const [nextOwner, label] = reserveTerminalLabel(owner, reason);

                createdTab = {
                    id: session.id,
                    label,
                    sessionId: session.id,
                    status: session.isAlive ? "alive" : "exited",
                    busyState: session.busyState,
                    hasManualInput: false,
                    shellName: session.currentProcess,
                    scriptTitleOverride:
                        reason.type === "script"
                            ? reason.scriptTitle
                            : undefined,
                };

                return {
                    owners: {
                        ...state.owners,
                        [ownerKey]: appendWorktreeTerminalTab(
                            nextOwner,
                            createdTab,
                        ),
                    },
                };
            });

            if (!createdTab) {
                throw new Error("Failed to create terminal tab.");
            }

            return createdTab;
        },
        setActiveTab(ownerKey, tabId) {
            set((state) => {
                const owner = state.owners[ownerKey];

                if (!owner) {
                    return state;
                }

                return {
                    owners: {
                        ...state.owners,
                        [ownerKey]: {
                            ...owner,
                            activeTabId: tabId,
                        },
                    },
                };
            });
        },
        markManualInput(ownerKey, tabId) {
            set((state) => {
                const owner = state.owners[ownerKey];

                if (!owner) {
                    return state;
                }

                return {
                    owners: {
                        ...state.owners,
                        [ownerKey]: {
                            ...owner,
                            tabs: owner.tabs.map((tab) =>
                                tab.id === tabId
                                    ? {
                                          ...tab,
                                          hasManualInput: true,
                                          scriptTitleOverride: undefined,
                                      }
                                    : tab,
                            ),
                        },
                    },
                };
            });
        },
        syncTabSnapshot(ownerKey, sessionId, snapshot) {
            set((state) => {
                const owner = state.owners[ownerKey];

                if (!owner) {
                    return state;
                }

                return {
                    owners: {
                        ...state.owners,
                        [ownerKey]: {
                            ...owner,
                            tabs: owner.tabs.map((tab) =>
                                tab.sessionId === sessionId
                                    ? syncWorktreeTerminalTab(tab, snapshot)
                                    : tab,
                            ),
                        },
                    },
                };
            });
        },
        async runScriptCommand({
            command,
            ownerKey,
            scriptTitle,
            worktreePath,
        }) {
            get().ensureOwner(ownerKey, worktreePath);
            const owner = get().owners[ownerKey];
            const activeTab = owner?.tabs.find(
                (tab) => tab.id === owner.activeTabId,
            );

            let activeSessionState:
                | Pick<
                      TerminalSessionSnapshot,
                      | "busyState"
                      | "currentProcess"
                      | "id"
                      | "isAlive"
                      | "sequence"
                  >
                | undefined;

            if (activeTab) {
                const [stateError, sessionState] = await tryPromise(
                    prRunApi.getTerminalSessionState(activeTab.sessionId),
                );

                if (!stateError) {
                    activeSessionState = sessionState;
                    get().syncTabSnapshot(
                        ownerKey,
                        activeTab.sessionId,
                        sessionState,
                    );
                }
            }

            const executionMode = resolveScriptExecutionMode({
                activeTab,
                activeSessionState,
            });
            const targetTab =
                executionMode === "reuse" && activeTab
                    ? activeTab
                    : await get().createTerminal(ownerKey, worktreePath, {
                          type: "script",
                          scriptTitle,
                      });

            if (executionMode === "reuse") {
                set((state) => {
                    const owner = state.owners[ownerKey];

                    if (!owner) {
                        return state;
                    }

                    return {
                        owners: {
                            ...state.owners,
                            [ownerKey]: {
                                ...owner,
                                tabs: owner.tabs.map((tab) =>
                                    tab.id === targetTab.id
                                        ? {
                                              ...tab,
                                              busyState: "busy",
                                              hasManualInput: false,
                                              label: scriptTitle,
                                              scriptTitleOverride: scriptTitle,
                                          }
                                        : tab,
                                ),
                            },
                        },
                    };
                });
            } else {
                set((state) => {
                    const owner = state.owners[ownerKey];

                    if (!owner) {
                        return state;
                    }

                    return {
                        owners: {
                            ...state.owners,
                            [ownerKey]: {
                                ...owner,
                                tabs: owner.tabs.map((tab) =>
                                    tab.id === targetTab.id
                                        ? {
                                              ...tab,
                                              busyState: "busy",
                                          }
                                        : tab,
                                ),
                            },
                        },
                    };
                });
            }

            const [writeError] = await tryPromise(
                prRunApi.writeTerminalInput(
                    targetTab.sessionId,
                    `${command.replace(/[\r\n]+$/, "")}\r`,
                    {
                        source: "script",
                    },
                ),
            );

            if (writeError) {
                throw writeError;
            }
        },
        async closeTab(ownerKey, tabId) {
            const owner = get().owners[ownerKey];
            const tab = owner?.tabs.find((item) => item.id === tabId);

            if (!tab) {
                return;
            }

            set((state) => ({
                owners: {
                    ...state.owners,
                    [ownerKey]: state.owners[ownerKey]
                        ? removeWorktreeTerminalTab(
                              state.owners[ownerKey],
                              tabId,
                          )
                        : owner,
                },
            }));

            await tryPromise(prRunApi.disposeTerminalSession(tab.sessionId));
        },
        async disposeOwner(ownerKey) {
            const owner = get().owners[ownerKey];

            if (!owner) {
                return;
            }

            for (const tab of owner.tabs) {
                await tryPromise(
                    prRunApi.disposeTerminalSession(tab.sessionId),
                );
            }

            set((state) => {
                const owners = { ...state.owners };
                delete owners[ownerKey];
                return { owners };
            });
        },
    }),
);

function reserveTerminalLabel(
    owner: WorktreeTerminalOwnerState,
    reason: CreateTerminalReason,
): [WorktreeTerminalOwnerState, string] {
    if (reason.type === "script") {
        const currentCount =
            owner.nextScriptLabelCounts[reason.scriptTitle] ?? 0;
        const nextCount = currentCount + 1;

        return [
            {
                ...owner,
                nextScriptLabelCounts: {
                    ...owner.nextScriptLabelCounts,
                    [reason.scriptTitle]: nextCount,
                },
            },
            nextCount === 1
                ? reason.scriptTitle
                : `${reason.scriptTitle} ${nextCount}`,
        ];
    }

    return [
        {
            ...owner,
            nextTerminalNumber: owner.nextTerminalNumber + 1,
        },
        `Terminal ${owner.nextTerminalNumber}`,
    ];
}

function syncWorktreeTerminalTab(
    tab: WorktreeTerminalTab,
    snapshot: Pick<
        TerminalSessionSnapshot,
        "busyState" | "currentProcess" | "id" | "isAlive"
    >,
): WorktreeTerminalTab {
    const nextTab: WorktreeTerminalTab = {
        ...tab,
        busyState:
            snapshot.isAlive && snapshot.busyState === "unknown"
                ? tab.busyState
                : snapshot.busyState,
        status: snapshot.isAlive ? "alive" : "exited",
    };

    if (tab.scriptTitleOverride) {
        if (
            snapshot.currentProcess === tab.scriptTitleOverride ||
            snapshot.currentProcess !== tab.shellName
        ) {
            return {
                ...nextTab,
                label: tab.scriptTitleOverride,
            };
        }

        nextTab.scriptTitleOverride = undefined;
    }

    if (snapshot.currentProcess) {
        nextTab.label = snapshot.currentProcess;
    }

    return nextTab;
}
