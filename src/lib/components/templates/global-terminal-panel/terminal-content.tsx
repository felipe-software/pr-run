import { Terminal } from "lucide-react";

import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Surface } from "@/lib/components/atoms/surface";
import { TerminalPane } from "@/lib/components/molecules/worktree-terminal/terminal-pane";
import { TerminalTabBar } from "@/lib/components/molecules/worktree-terminal/terminal-tab-bar";
import type { TerminalTreeTab } from "@/lib/components/templates/global-terminal-panel/terminal-selection";
import type { WorktreeTerminalOwnerState } from "@/lib/hooks/store/use-worktree-terminal-store";

type TerminalContentProps = {
    owner: WorktreeTerminalOwnerState | null;
    ownerKey: string | null;
    selectedTerminal: TerminalTreeTab | null;
    onCloseTab: (tabId: string) => void;
    onCreateTerminal: () => void;
    onSelectTab: (tabId: string) => void;
};

export function TerminalContent({
    owner,
    ownerKey,
    selectedTerminal,
    onCloseTab,
    onCreateTerminal,
    onSelectTab,
}: TerminalContentProps) {
    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pr-0 pl-0.5">
            {owner && ownerKey ? (
                <div className="shrink-0 px-1 pb-0.5">
                    <TerminalTabBar
                        activeTabId={owner.activeTabId}
                        tabs={owner.tabs}
                        onCloseTab={onCloseTab}
                        onCreateTerminal={onCreateTerminal}
                        onSelectTab={onSelectTab}
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
                        className="flex h-full items-center justify-center"
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
    );
}
