import { useCallback } from "react";

import { useTerminalPane } from "@/lib/components/molecules/worktree-terminal/use-terminal-pane";
import { useWorktreeTerminalStore } from "@/lib/hooks/store/use-worktree-terminal-store";
import type { TerminalSessionSnapshot } from "@/types/pr-run";

type TerminalPaneProps = {
    ownerKey: string;
    tabId: string;
    sessionId: string;
};

export function TerminalPane({
    ownerKey,
    tabId,
    sessionId,
}: TerminalPaneProps) {
    const markManualInput = useWorktreeTerminalStore(
        (state) => state.markManualInput,
    );
    const syncTabSnapshot = useWorktreeTerminalStore(
        (state) => state.syncTabSnapshot,
    );
    const { mountRef } = useTerminalPane({
        onExit: useCallback(() => {
            syncTabSnapshot(ownerKey, sessionId, {
                busyState: "unknown",
                currentProcess: "",
                id: sessionId,
                isAlive: false,
            });
        }, [ownerKey, sessionId, syncTabSnapshot]),
        onManualInput: useCallback(() => {
            markManualInput(ownerKey, tabId);
        }, [markManualInput, ownerKey, tabId]),
        onSnapshot: useCallback(
            (snapshot: TerminalSessionSnapshot) => {
                syncTabSnapshot(ownerKey, sessionId, snapshot);
            },
            [ownerKey, sessionId, syncTabSnapshot],
        ),
        onUpdate: useCallback(
            (snapshot) => {
                syncTabSnapshot(ownerKey, sessionId, snapshot);
            },
            [ownerKey, sessionId, syncTabSnapshot],
        ),
        sessionId,
    });

    return (
        <div
            className="min-h-0 flex-1 overflow-hidden rounded-b-lg border border-border bg-[#050505] text-white shadow-sm/10"
            ref={mountRef}
        />
    );
}
