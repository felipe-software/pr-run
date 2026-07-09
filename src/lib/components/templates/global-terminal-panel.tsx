import { ChevronDown, ChevronRight, Terminal, X } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { BusyIcon } from "@/lib/components/atoms/busy-icon";
import { Button } from "@/lib/components/ui/button";
import { toast } from "@/lib/components/ui/toast";
import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Surface } from "@/lib/components/atoms/surface";
import { TerminalPane } from "@/lib/components/molecules/worktree-terminal/terminal-pane";
import { TerminalTabBar } from "@/lib/components/molecules/worktree-terminal/terminal-tab-bar";
import { tryPromise } from "@/lib/error";
import { useWorktreeTerminalStore } from "@/lib/hooks/store/use-worktree-terminal-store";
import { cn } from "@/lib/utils/cn";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { ProjectGroup } from "@/types/pr-run";

type GlobalTerminalPanelProps = {
    groups: ProjectGroup[];
    height: number;
    isAutoHeight: boolean;
    isOpen: boolean;
    preferredOwnerKey: string | null;
    sidebarWidth: number;
    selectedTerminalKey: string | null;
    onBeginSidebarResize: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onBeginResize: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onClose: () => void;
    onSelectTerminal: (terminalKey: string) => void;
};

type TerminalTreeGroup = {
    branchName: string;
    id: string;
    isBusy: boolean;
    ownerKey: string;
    projectId: string;
    title: string;
    terminals: TerminalTreeTab[];
};

type TerminalTreeTab = {
    branchName: string;
    busyState: "idle" | "busy" | "unknown";
    id: string;
    isAlive: boolean;
    label: string;
    ownerKey: string;
    projectId: string;
    sessionId: string;
    terminalKey: string;
};

export function GlobalTerminalPanel({
    groups,
    height,
    isAutoHeight,
    isOpen,
    preferredOwnerKey,
    sidebarWidth,
    selectedTerminalKey,
    onBeginSidebarResize,
    onBeginResize,
    onClose,
    onSelectTerminal,
}: GlobalTerminalPanelProps) {
    const owners = useWorktreeTerminalStore((state) => state.owners);
    const createTerminal = useWorktreeTerminalStore(
        (state) => state.createTerminal,
    );
    const closeTab = useWorktreeTerminalStore((state) => state.closeTab);
    const setActiveTab = useWorktreeTerminalStore(
        (state) => state.setActiveTab,
    );
    const tree = useMemo(
        () => buildTerminalTree(groups, owners),
        [groups, owners],
    );
    const terminals = useMemo(() => flattenTerminalTree(tree), [tree]);
    const preferredTerminal = preferredOwnerKey
        ? (terminals.find(
              (terminal) => terminal.ownerKey === preferredOwnerKey,
          ) ?? null)
        : null;
    const selectedTerminal =
        terminals.find(
            (terminal) => terminal.terminalKey === selectedTerminalKey,
        ) ??
        preferredTerminal ??
        terminals[0] ??
        null;
    const selectedOwnerKey = selectedTerminal?.ownerKey ?? preferredOwnerKey;
    const selectedOwner = selectedOwnerKey ? owners[selectedOwnerKey] : null;
    const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
        () => new Set(),
    );

    useEffect(() => {
        if (!isOpen || !selectedTerminal) {
            return;
        }

        setExpandedGroupIds((current) => {
            if (current.has(selectedTerminal.ownerKey)) {
                return current;
            }

            return new Set([...current, selectedTerminal.ownerKey]);
        });
    }, [isOpen, selectedTerminal]);

    if (!isOpen) {
        return null;
    }

    function selectTerminal(terminal: TerminalTreeTab) {
        setActiveTab(terminal.ownerKey, terminal.id);
        onSelectTerminal(terminal.terminalKey);
    }

    async function createManualTerminal() {
        if (!selectedOwner || !selectedOwnerKey) {
            return;
        }

        const [error, tab] = await tryPromise(
            createTerminal(selectedOwnerKey, selectedOwner.worktreePath, {
                type: "manual",
            }),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        onSelectTerminal(getTerminalKey(selectedOwnerKey, tab.id));
    }

    async function closeTerminalTab(tabId: string) {
        if (!selectedOwnerKey) {
            return;
        }

        const [error] = await tryPromise(closeTab(selectedOwnerKey, tabId));

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
        }
    }

    return (
        <section
            className={cn(
                `border-sidebar-border bg-sidebar text-sidebar-foreground
                relative flex min-h-48 flex-col border-t`,
                isAutoHeight ? "min-h-0 flex-1" : "shrink-0",
            )}
            style={isAutoHeight ? undefined : { height }}
        >
            <div
                aria-label="Resize terminal panel"
                className="hover:bg-sidebar-accent/70 absolute top-0 right-0
                    left-0 z-20 h-2 -translate-y-1/2 cursor-row-resize
                    transition-colors"
                role="separator"
                onPointerDown={onBeginResize}
            />

            <div className="flex min-h-0 flex-1">
                <div
                    className="flex min-h-0 min-w-0 flex-1 flex-col pr-0 pl-0.5"
                >
                    {selectedOwner && selectedOwnerKey ? (
                        <div className="shrink-0 px-1 pb-0.5">
                            <TerminalTabBar
                                activeTabId={selectedOwner.activeTabId}
                                tabs={selectedOwner.tabs}
                                onCloseTab={(tabId) => {
                                    closeTerminalTab(tabId);
                                }}
                                onCreateTerminal={() => {
                                    createManualTerminal();
                                }}
                                onSelectTab={(tabId) => {
                                    setActiveTab(selectedOwnerKey, tabId);
                                    onSelectTerminal(
                                        getTerminalKey(selectedOwnerKey, tabId),
                                    );
                                }}
                            />
                        </div>
                    ) : null}
                    <div className="flex min-h-0 flex-1">
                        {selectedTerminal ? (
                            <TerminalPane
                                ownerKey={selectedTerminal.ownerKey}
                                sessionId={selectedTerminal.sessionId}
                                tabId={selectedTerminal.id}
                            />
                        ) : (
                            <Surface
                                className="grid h-full place-items-center"
                                variant="muted"
                            >
                                <EmptyState
                                    description="Open a worktree terminal to show it here."
                                    icon={<Terminal className="h-4 w-4" />}
                                    title="No terminals"
                                />
                            </Surface>
                        )}
                    </div>
                </div>

                <aside
                    className="border-sidebar-border bg-sidebar
                        text-sidebar-foreground relative flex shrink-0 border-l"
                    style={{ width: sidebarWidth }}
                >
                    <div
                        aria-label="Resize terminal list"
                        className="hover:bg-sidebar-accent/70 absolute top-0
                            bottom-0 left-0 z-20 w-2 -translate-x-1/2
                            cursor-col-resize transition-colors"
                        role="separator"
                        onPointerDown={onBeginSidebarResize}
                    />
                    <div className="min-h-0 flex-1 overflow-auto px-1 py-0.5">
                        {tree.length === 0 ? (
                            <div
                                className="text-muted-foreground px-1.5 py-1.5
                                    text-[11px]"
                            >
                                No terminals.
                            </div>
                        ) : null}

                        {tree.map((group) => {
                            const isGroupExpanded = expandedGroupIds.has(
                                group.id,
                            );

                            return (
                                <div key={group.id}>
                                    <button
                                        className="hover:bg-sidebar-accent flex
                                            h-6 w-full min-w-0 cursor-pointer
                                            items-center gap-1 rounded px-1.5
                                            text-left text-xs transition-colors
                                            outline-none"
                                        type="button"
                                        onClick={() =>
                                            setExpandedGroupIds((current) =>
                                                toggleSetValue(
                                                    current,
                                                    group.id,
                                                ),
                                            )
                                        }
                                    >
                                        {isGroupExpanded ? (
                                            <ChevronDown
                                                className="h-3.5 w-3.5 shrink-0"
                                            />
                                        ) : (
                                            <ChevronRight
                                                className="h-3.5 w-3.5 shrink-0"
                                            />
                                        )}
                                        <span className="truncate font-medium">
                                            {group.title}
                                        </span>
                                        {group.isBusy ? (
                                            <BusyIcon
                                                className="ml-auto"
                                                size="sm"
                                            />
                                        ) : null}
                                        <span
                                            className="text-muted-foreground
                                                text-[10px] tabular-nums"
                                        >
                                            {group.terminals.length}
                                        </span>
                                    </button>

                                    {isGroupExpanded
                                        ? group.terminals.map((tab) => (
                                              <button
                                                  className={cn(
                                                      `hover:bg-sidebar-accent
                                                        flex h-6 w-full min-w-0
                                                        cursor-pointer
                                                        items-center gap-1.5
                                                        rounded px-1.5 pl-6
                                                        text-left text-[11px]
                                                        transition-colors
                                                        outline-none`,
                                                      selectedTerminal?.terminalKey ===
                                                          tab.terminalKey &&
                                                          `bg-sidebar-accent
                                                            text-sidebar-accent-foreground`,
                                                  )}
                                                  key={tab.terminalKey}
                                                  type="button"
                                                  onClick={() =>
                                                      selectTerminal(tab)
                                                  }
                                              >
                                                  <Terminal
                                                      className="text-muted-foreground
                                                        h-3.5 w-3.5 shrink-0"
                                                  />
                                                  <span
                                                      className="min-w-0 flex-1
                                                        truncate"
                                                  >
                                                      {tab.label}
                                                  </span>
                                                  {tab.busyState === "busy" ? (
                                                      <BusyIcon
                                                          className="ml-auto"
                                                          size="sm"
                                                      />
                                                  ) : null}
                                              </button>
                                          ))
                                        : null}
                                </div>
                            );
                        })}
                    </div>
                    <div
                        className="border-sidebar-border flex h-full w-8
                            shrink-0 flex-col items-center border-l py-1"
                    >
                        <Button
                            aria-label="Close terminals panel"
                            className="text-muted-foreground border-transparent
                                bg-transparent shadow-none"
                            size="icon-xs"
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </aside>
            </div>
        </section>
    );
}

function buildTerminalTree(
    groups: ProjectGroup[],
    owners: ReturnType<typeof useWorktreeTerminalStore.getState>["owners"],
) {
    const projects = groups.flatMap((group) => group.projects);
    const projectNameById = new Map(
        projects.map((project) => [project.id, project.name]),
    );
    const projectOrder = new Map(
        projects.map((project, index) => [project.id, index]),
    );
    const groupMap = new Map<string, TerminalTreeGroup>();

    for (const [ownerKey, owner] of Object.entries(owners)) {
        if (owner.tabs.length === 0) {
            continue;
        }

        const { branchName, projectId } = parseOwnerKey(ownerKey);
        const projectName = projectNameById.get(projectId) ?? projectId;
        const group = ensureTerminalGroup(
            groupMap,
            ownerKey,
            branchName,
            projectId,
            `${projectName} - ${branchName}`,
        );

        group.terminals.push(
            ...owner.tabs.map((tab) => ({
                branchName,
                busyState: tab.busyState,
                id: tab.id,
                isAlive: tab.status === "alive",
                label: tab.label,
                ownerKey,
                projectId,
                sessionId: tab.sessionId,
                terminalKey: getTerminalKey(ownerKey, tab.id),
            })),
        );
        group.isBusy = group.terminals.some(
            (terminal) => terminal.isAlive && terminal.busyState === "busy",
        );
    }

    return [...groupMap.values()].sort(
        (left, right) =>
            (projectOrder.get(left.projectId) ?? Number.MAX_SAFE_INTEGER) -
                (projectOrder.get(right.projectId) ??
                    Number.MAX_SAFE_INTEGER) ||
            left.branchName.localeCompare(right.branchName),
    );
}

function ensureTerminalGroup(
    groupMap: Map<string, TerminalTreeGroup>,
    ownerKey: string,
    branchName: string,
    projectId: string,
    title: string,
) {
    const existing = groupMap.get(ownerKey);

    if (existing) {
        return existing;
    }

    const group: TerminalTreeGroup = {
        branchName,
        id: ownerKey,
        isBusy: false,
        ownerKey,
        projectId,
        title,
        terminals: [],
    };

    groupMap.set(ownerKey, group);
    return group;
}

function flattenTerminalTree(tree: TerminalTreeGroup[]) {
    return tree.flatMap((group) => group.terminals);
}

export function getTerminalKey(ownerKey: string, tabId: string) {
    return `${ownerKey}::${tabId}`;
}

function parseOwnerKey(ownerKey: string) {
    const separatorIndex = ownerKey.indexOf(":");

    if (separatorIndex === -1) {
        return {
            branchName: ownerKey,
            projectId: ownerKey,
        };
    }

    return {
        branchName: ownerKey.slice(separatorIndex + 1),
        projectId: ownerKey.slice(0, separatorIndex),
    };
}

function toggleSetValue(set: Set<string>, value: string) {
    const next = new Set(set);

    if (next.has(value)) {
        next.delete(value);
    } else {
        next.add(value);
    }

    return next;
}
