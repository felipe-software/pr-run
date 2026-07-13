import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { TerminalContent } from "@/lib/components/templates/global-terminal-panel/terminal-content";
import { TerminalPanelResizeHandle } from "@/lib/components/templates/global-terminal-panel/terminal-resize-handle";
import {
    buildTerminalTree,
    flattenTerminalTree,
    getTerminalKey,
    selectGlobalTerminal,
    toggleTerminalGroup,
    type TerminalTreeTab,
} from "@/lib/components/templates/global-terminal-panel/terminal-selection";
import { TerminalSidebar } from "@/lib/components/templates/global-terminal-panel/terminal-sidebar";
import { toast } from "@/lib/components/ui/toast";
import { tryPromise } from "@/lib/error";
import { useWorktreeTerminalStore } from "@/lib/hooks/store/use-worktree-terminal-store";
import { useWorktreeTerminalActions } from "@/lib/hooks/use-worktree-terminal-actions";
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
    onBeginResize: (
        event: ReactPointerEvent<HTMLDivElement>,
        startHeightOverride?: number,
    ) => void;
    onClose: () => void;
    onSelectTerminal: (terminalKey: string) => void;
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
    const setActiveTab = useWorktreeTerminalStore(
        (state) => state.setActiveTab,
    );
    const { closeTab, createTerminal } = useWorktreeTerminalActions();
    const tree = useMemo(
        () => buildTerminalTree(groups, owners),
        [groups, owners],
    );
    const terminals = useMemo(() => flattenTerminalTree(tree), [tree]);
    const selectedTerminal = selectGlobalTerminal(
        terminals,
        preferredOwnerKey,
        selectedTerminalKey,
    );
    const selectedOwnerKey = selectedTerminal?.ownerKey ?? preferredOwnerKey;
    const selectedOwner = selectedOwnerKey ? owners[selectedOwnerKey] : null;
    const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(
        () => new Set(),
    );
    const maximumPanelHeight = Math.max(
        height,
        typeof window === "undefined" ? height : window.innerHeight,
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

    function selectOwnerTab(tabId: string) {
        if (!selectedOwnerKey) {
            return;
        }

        setActiveTab(selectedOwnerKey, tabId);
        onSelectTerminal(getTerminalKey(selectedOwnerKey, tabId));
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
            <TerminalPanelResizeHandle
                height={height}
                maximumHeight={maximumPanelHeight}
                onBeginResize={onBeginResize}
            />
            <div id="global-terminal-content" className="flex min-h-0 flex-1">
                <TerminalContent
                    owner={selectedOwner ?? null}
                    ownerKey={selectedOwnerKey}
                    selectedTerminal={selectedTerminal}
                    onCloseTab={(tabId) => {
                        closeTerminalTab(tabId);
                    }}
                    onCreateTerminal={() => {
                        createManualTerminal();
                    }}
                    onSelectTab={selectOwnerTab}
                />
                <TerminalSidebar
                    expandedGroupIds={expandedGroupIds}
                    selectedTerminalKey={selectedTerminal?.terminalKey}
                    tree={tree}
                    width={sidebarWidth}
                    onBeginResize={onBeginSidebarResize}
                    onClose={onClose}
                    onSelectTerminal={selectTerminal}
                    onToggleGroup={(groupId) =>
                        setExpandedGroupIds((current) =>
                            toggleTerminalGroup(current, groupId),
                        )
                    }
                />
            </div>
        </section>
    );
}
