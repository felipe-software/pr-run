import { TerminalSquare } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Surface } from "@/lib/components/atoms/surface";
import { TerminalPane } from "@/lib/components/molecules/worktree-terminal/terminal-pane";
import { TerminalTabBar } from "@/lib/components/molecules/worktree-terminal/terminal-tab-bar";
import { useWorktreeTerminalOwner } from "@/lib/components/molecules/worktree-terminal/use-worktree-terminal-owner";

type WorktreeTerminalProps = {
    ownerKey: string;
    worktreePath: string;
};

export function WorktreeTerminal({
    ownerKey,
    worktreePath,
}: WorktreeTerminalProps) {
    const { closeTerminalTab, createManualTerminal, owner, setActiveTab } =
        useWorktreeTerminalOwner({
            ownerKey,
            worktreePath,
        });

    const activeTab = owner?.tabs.find((tab) => tab.id === owner.activeTabId);

    return (
        <section className="flex min-h-0 flex-1 flex-col">
            {owner?.tabs.length ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    <TerminalTabBar
                        activeTabId={owner.activeTabId}
                        tabs={owner.tabs}
                        onCloseTab={(tabId) => {
                            closeTerminalTab(tabId);
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
                                onClick={() => {
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
