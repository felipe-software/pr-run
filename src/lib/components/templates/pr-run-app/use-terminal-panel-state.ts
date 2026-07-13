import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { RunTerminalContext } from "@/lib/components/templates/main-panel";
import {
    getActiveOwnerTerminalKey,
    getPreferredGlobalTerminalKey,
    terminalPanelSize,
} from "@/lib/components/templates/pr-run-app/terminal-state";
import { toast } from "@/lib/components/ui/toast";
import { tryPromise } from "@/lib/error";
import { useUiPreferencesStore } from "@/lib/hooks/store/use-ui-preferences-store";
import { useWorktreeTerminalStore } from "@/lib/hooks/store/use-worktree-terminal-store";
import { usePointerDrag } from "@/lib/hooks/use-pointer-drag";
import { useWorktreeTerminalActions } from "@/lib/hooks/use-worktree-terminal-actions";
import { getErrorMessage } from "@/lib/utils/get-error-message";

const TERMINAL_RESIZE_BUSY_SYNC_DELAY_MS = 800;
const GLOBAL_TERMINAL_OWNER_KEY = "global:home";

export function useTerminalPanelState() {
    const { createTerminal } = useWorktreeTerminalActions();
    const startPointerDrag = usePointerDrag();
    const storedHeight = useUiPreferencesStore(
        (store) => store.terminalPanelHeight,
    );
    const setStoredHeight = useUiPreferencesStore(
        (store) => store.setTerminalPanelHeight,
    );
    const storedSidebarWidth = useUiPreferencesStore(
        (store) => store.terminalListWidth,
    );
    const setStoredSidebarWidth = useUiPreferencesStore(
        (store) => store.setTerminalListWidth,
    );
    const [height, setHeight] = useState(() =>
        terminalPanelSize.initialHeight(storedHeight),
    );
    const [sidebarWidth, setSidebarWidth] = useState(() =>
        terminalPanelSize.initialSidebarWidth(storedSidebarWidth),
    );
    const [isAutoHeight, setIsAutoHeight] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [runContext, setRunContext] = useState<RunTerminalContext | null>(
        null,
    );
    const [selectedTerminalKey, setSelectedTerminalKey] = useState<
        string | null
    >(null);
    const resizeSettleTimeoutRef = useRef<number | null>(null);
    const preferredGlobalTerminalKey = useWorktreeTerminalStore((store) =>
        getPreferredGlobalTerminalKey(store.owners),
    );
    const runTerminalKey = useWorktreeTerminalStore((store) =>
        runContext
            ? getActiveOwnerTerminalKey(store.owners, runContext.ownerKey)
            : null,
    );

    useEffect(() => {
        return () => {
            if (resizeSettleTimeoutRef.current !== null) {
                window.clearTimeout(resizeSettleTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        setStoredHeight(height);
    }, [height, setStoredHeight]);

    useEffect(() => {
        setStoredSidebarWidth(sidebarWidth);
    }, [setStoredSidebarWidth, sidebarWidth]);

    useEffect(() => {
        if (runContext && runTerminalKey) {
            setSelectedTerminalKey(runTerminalKey);
        }
    }, [runContext, runTerminalKey]);

    const updateRunContext = useCallback(
        (context: RunTerminalContext | null) => {
            setRunContext(context);
            setIsAutoHeight(Boolean(context));
            setIsOpen(Boolean(context));

            if (context) {
                const terminalKey = getActiveOwnerTerminalKey(
                    useWorktreeTerminalStore.getState().owners,
                    context.ownerKey,
                );

                if (terminalKey) {
                    setSelectedTerminalKey(terminalKey);
                }
            }
        },
        [],
    );

    function beginResize() {
        if (resizeSettleTimeoutRef.current !== null) {
            window.clearTimeout(resizeSettleTimeoutRef.current);
            resizeSettleTimeoutRef.current = null;
        }

        setIsResizing(true);
    }

    function finishResize() {
        if (resizeSettleTimeoutRef.current !== null) {
            window.clearTimeout(resizeSettleTimeoutRef.current);
        }

        resizeSettleTimeoutRef.current = window.setTimeout(() => {
            resizeSettleTimeoutRef.current = null;
            setIsResizing(false);
        }, TERMINAL_RESIZE_BUSY_SYNC_DELAY_MS);
    }

    function beginPanelResize(
        event: ReactPointerEvent<HTMLDivElement>,
        startHeightOverride?: number,
    ) {
        event.preventDefault();
        beginResize();

        const startY = event.clientY;
        const measuredHeight =
            startHeightOverride ??
            event.currentTarget.parentElement?.getBoundingClientRect().height ??
            height;
        const startHeight = terminalPanelSize.initialHeight(measuredHeight);

        setHeight(startHeight);
        setIsAutoHeight(false);
        startPointerDrag({
            cursor: "row-resize",
            onEnd: finishResize,
            onMove: (moveEvent) => {
                setHeight(
                    terminalPanelSize.resizeHeight(
                        startHeight,
                        startY,
                        moveEvent.clientY,
                    ),
                );
            },
        });
    }

    function beginSidebarResize(event: ReactPointerEvent<HTMLDivElement>) {
        event.preventDefault();
        beginResize();

        const startX = event.clientX;
        const startWidth = sidebarWidth;

        startPointerDrag({
            cursor: "col-resize",
            onEnd: finishResize,
            onMove: (moveEvent) => {
                setSidebarWidth(
                    terminalPanelSize.resizeSidebarWidth(
                        startWidth,
                        startX,
                        moveEvent.clientX,
                    ),
                );
            },
        });
    }

    async function openGlobalPanel() {
        setIsAutoHeight(false);
        setIsOpen(true);

        if (preferredGlobalTerminalKey) {
            setSelectedTerminalKey(
                (current) => current ?? preferredGlobalTerminalKey,
            );
            return;
        }

        const [error, tab] = await tryPromise(
            createTerminal(GLOBAL_TERMINAL_OWNER_KEY, "~", {
                type: "manual",
            }),
        );

        if (error) {
            toast.error(getErrorMessage(error), { timeout: 3200 });
            return;
        }

        setSelectedTerminalKey(`${GLOBAL_TERMINAL_OWNER_KEY}::${tab.id}`);
    }

    return {
        beginPanelResize,
        beginSidebarResize,
        close: () => setIsOpen(false),
        height,
        isAutoHeight,
        isOpen,
        isResizing,
        isRunTerminalDocked: Boolean(runContext && isOpen && isAutoHeight),
        openGlobalPanel,
        preferredOwnerKey: runContext?.ownerKey ?? null,
        selectedTerminalKey,
        setSelectedTerminalKey,
        sidebarWidth,
        updateRunContext,
    };
}
