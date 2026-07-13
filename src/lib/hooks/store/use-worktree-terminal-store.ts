import { create } from "zustand";

import type {
    TerminalBusyState,
    TerminalSession,
    TerminalSessionSnapshot,
} from "@/types/pr-run";

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

export type CreateTerminalReason =
    | { type: "default" | "manual" }
    | { type: "script"; scriptTitle: string };

export type RunScriptCommandParams = {
    command: string;
    ownerKey: WorktreeTerminalOwnerKey;
    scriptTitle: string;
    worktreePath: string;
};

type WorktreeTerminalStoreState = {
    owners: Record<WorktreeTerminalOwnerKey, WorktreeTerminalOwnerState>;
    addSession: (
        ownerKey: WorktreeTerminalOwnerKey,
        worktreePath: string,
        reason: CreateTerminalReason,
        session: TerminalSession,
    ) => WorktreeTerminalTab;
    ensureOwner: (
        ownerKey: WorktreeTerminalOwnerKey,
        worktreePath: string,
    ) => void;
    markManualInput: (
        ownerKey: WorktreeTerminalOwnerKey,
        tabId: string,
    ) => void;
    markScriptRunning: (
        ownerKey: WorktreeTerminalOwnerKey,
        tabId: string,
        scriptTitle: string,
    ) => void;
    removeOwner: (ownerKey: WorktreeTerminalOwnerKey) => void;
    removeTab: (ownerKey: WorktreeTerminalOwnerKey, tabId: string) => void;
    setActiveTab: (ownerKey: WorktreeTerminalOwnerKey, tabId: string) => void;
    setDefaultTerminalState: (
        ownerKey: WorktreeTerminalOwnerKey,
        worktreePath: string,
        terminalState: WorktreeTerminalOwnerState["defaultTerminalState"],
    ) => void;
    syncTabSnapshot: (
        ownerKey: WorktreeTerminalOwnerKey,
        sessionId: string,
        snapshot: Pick<
            TerminalSessionSnapshot,
            "busyState" | "currentProcess" | "id" | "isAlive"
        >,
    ) => void;
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
        setDefaultTerminalState(ownerKey, worktreePath, terminalState) {
            set((state) => ({
                owners: {
                    ...state.owners,
                    [ownerKey]: state.owners[ownerKey]
                        ? {
                              ...state.owners[ownerKey],
                              defaultTerminalState: terminalState,
                          }
                        : {
                              ...createWorktreeTerminalOwnerState(worktreePath),
                              defaultTerminalState: terminalState,
                          },
                },
            }));
        },
        addSession(ownerKey, worktreePath, reason, session) {
            get().ensureOwner(ownerKey, worktreePath);
            const owner =
                get().owners[ownerKey] ??
                createWorktreeTerminalOwnerState(worktreePath);
            const [nextOwner, label] = reserveTerminalLabel(owner, reason);
            const tab: WorktreeTerminalTab = {
                busyState: session.busyState,
                hasManualInput: false,
                id: session.id,
                label,
                scriptTitleOverride:
                    reason.type === "script" ? reason.scriptTitle : undefined,
                sessionId: session.id,
                shellName: session.currentProcess,
                status: session.isAlive ? "alive" : "exited",
            };

            set((state) => ({
                owners: {
                    ...state.owners,
                    [ownerKey]: appendWorktreeTerminalTab(nextOwner, tab),
                },
            }));

            return tab;
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
            set((state) =>
                updateOwnerTabs(state, ownerKey, (tab) =>
                    tab.id === tabId
                        ? {
                              ...tab,
                              hasManualInput: true,
                              scriptTitleOverride: undefined,
                          }
                        : tab,
                ),
            );
        },
        markScriptRunning(ownerKey, tabId, scriptTitle) {
            set((state) =>
                updateOwnerTabs(state, ownerKey, (tab) =>
                    tab.id === tabId
                        ? {
                              ...tab,
                              busyState: "busy",
                              hasManualInput: false,
                              label: scriptTitle,
                              scriptTitleOverride: scriptTitle,
                          }
                        : tab,
                ),
            );
        },
        syncTabSnapshot(ownerKey, sessionId, snapshot) {
            set((state) =>
                updateOwnerTabs(state, ownerKey, (tab) =>
                    tab.sessionId === sessionId
                        ? syncWorktreeTerminalTab(tab, snapshot)
                        : tab,
                ),
            );
        },
        removeTab(ownerKey, tabId) {
            set((state) => {
                const owner = state.owners[ownerKey];

                if (!owner) {
                    return state;
                }

                return {
                    owners: {
                        ...state.owners,
                        [ownerKey]: removeWorktreeTerminalTab(owner, tabId),
                    },
                };
            });
        },
        removeOwner(ownerKey) {
            set((state) => {
                const owners = { ...state.owners };
                delete owners[ownerKey];
                return { owners };
            });
        },
    }),
);

function updateOwnerTabs(
    state: WorktreeTerminalStoreState,
    ownerKey: string,
    updateTab: (tab: WorktreeTerminalTab) => WorktreeTerminalTab,
) {
    const owner = state.owners[ownerKey];

    if (!owner) {
        return state;
    }

    let hasChanges = false;
    const tabs = owner.tabs.map((tab) => {
        const nextTab = updateTab(tab);
        hasChanges ||= nextTab !== tab;
        return nextTab;
    });

    if (!hasChanges) {
        return state;
    }

    return {
        owners: {
            ...state.owners,
            [ownerKey]: {
                ...owner,
                tabs,
            },
        },
    };
}

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
    const busyState =
        snapshot.isAlive && snapshot.busyState === "unknown"
            ? tab.busyState
            : snapshot.busyState;
    const status = snapshot.isAlive ? "alive" : "exited";
    let label = tab.label;
    let scriptTitleOverride = tab.scriptTitleOverride;

    if (tab.scriptTitleOverride) {
        if (
            snapshot.currentProcess === tab.scriptTitleOverride ||
            snapshot.currentProcess !== tab.shellName
        ) {
            label = tab.scriptTitleOverride;
        } else {
            scriptTitleOverride = undefined;

            if (snapshot.currentProcess) {
                label = snapshot.currentProcess;
            }
        }
    } else if (snapshot.currentProcess) {
        label = snapshot.currentProcess;
    }

    if (
        busyState === tab.busyState &&
        status === tab.status &&
        label === tab.label &&
        scriptTitleOverride === tab.scriptTitleOverride
    ) {
        return tab;
    }

    return {
        ...tab,
        busyState,
        label,
        scriptTitleOverride,
        status,
    };
}
