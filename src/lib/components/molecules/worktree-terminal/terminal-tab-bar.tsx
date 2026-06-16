import { Plus, X } from "lucide-react";
import type { MouseEvent } from "react";

import { Button } from "@/lib/components/atoms/button";
import { cn } from "@/lib/utils/cn";
import type { WorktreeTerminalTab } from "@/lib/hooks/store/use-worktree-terminal-store";

type TerminalTabBarProps = {
    activeTabId: string | null;
    onCloseTab: (tabId: string) => void;
    onCreateTerminal: () => void;
    onSelectTab: (tabId: string) => void;
    tabs: WorktreeTerminalTab[];
};

export function TerminalTabBar({
    activeTabId,
    onCloseTab,
    onCreateTerminal,
    onSelectTab,
    tabs,
}: TerminalTabBarProps) {
    function handleMiddleClick(
        event: MouseEvent<HTMLDivElement>,
        tabId: string,
    ) {
        if (event.button !== 1) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        onCloseTab(tabId);
    }

    return (
        <div className="flex min-w-0 items-end overflow-hidden">
            <div className="flex min-w-0 flex-1 items-end gap-0 overflow-x-auto">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;

                    return (
                        <div
                            className={cn(
                                "group -mr-px flex h-8 min-w-0 max-w-56 items-center gap-1 rounded-t-md border border-b-0 border-border pl-2.5 pr-1 py-1 text-xs font-semibold transition",
                                isActive
                                    ? "bg-surface text-foreground"
                                    : "bg-background/90 text-muted-foreground hover:bg-muted/20 hover:text-foreground",
                            )}
                            key={tab.id}
                            onAuxClick={(event) =>
                                handleMiddleClick(event, tab.id)
                            }
                            onMouseDown={(event) =>
                                handleMiddleClick(event, tab.id)
                            }
                        >
                            <button
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                type="button"
                                onClick={() => onSelectTab(tab.id)}
                            >
                                {tab.busyState === "busy" ? (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                                ) : tab.status === "exited" ? (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                                ) : null}
                                <span className="truncate">{tab.label}</span>
                                <span className="sr-only">
                                    {tab.status === "exited"
                                        ? "shell exited"
                                        : tab.busyState === "busy"
                                          ? "busy shell"
                                          : "idle shell"}
                                </span>
                            </button>
                            <button
                                aria-label={`Close ${tab.label}`}
                                className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-muted/20 hover:text-foreground",
                                    isActive
                                        ? "opacity-100"
                                        : "opacity-0 group-hover:opacity-100",
                                )}
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onCloseTab(tab.id);
                                }}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    );
                })}
                <Button
                    aria-label="Create terminal"
                    className="self-end rounded-t-md rounded-b-none border-b-0"
                    isIconOnly
                    size="icon-sm"
                    type="button"
                    variant="outline"
                    onPress={onCreateTerminal}
                >
                    <Plus className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    );
}
