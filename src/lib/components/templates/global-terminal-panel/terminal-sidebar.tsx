import { ChevronDown, ChevronRight, Terminal, X } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { BusyIcon } from "@/lib/components/atoms/busy-icon";
import type {
    TerminalTreeGroup,
    TerminalTreeTab,
} from "@/lib/components/templates/global-terminal-panel/terminal-selection";
import { TerminalSidebarResizeHandle } from "@/lib/components/templates/global-terminal-panel/terminal-resize-handle";
import { Button } from "@/lib/components/ui/button";
import { cn } from "@/lib/utils/cn";

type TerminalSidebarProps = {
    expandedGroupIds: Set<string>;
    selectedTerminalKey?: string;
    tree: TerminalTreeGroup[];
    width: number;
    onBeginResize: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onClose: () => void;
    onSelectTerminal: (terminal: TerminalTreeTab) => void;
    onToggleGroup: (groupId: string) => void;
};

export function TerminalSidebar({
    expandedGroupIds,
    selectedTerminalKey,
    tree,
    width,
    onBeginResize,
    onClose,
    onSelectTerminal,
    onToggleGroup,
}: TerminalSidebarProps) {
    return (
        <aside
            className="border-sidebar-border bg-sidebar text-sidebar-foreground
                relative flex shrink-0 border-l"
            style={{ width }}
        >
            <TerminalSidebarResizeHandle
                width={width}
                onBeginResize={onBeginResize}
            />
            <div
                id="global-terminal-sidebar"
                className="min-h-0 flex-1 overflow-auto px-1 py-0.5"
            >
                {tree.length === 0 ? (
                    <div
                        className="text-muted-foreground px-1.5 py-1.5
                            text-[11px]"
                    >
                        No terminals.
                    </div>
                ) : null}

                {tree.map((group) => {
                    const isGroupExpanded = expandedGroupIds.has(group.id);

                    return (
                        <div key={group.id}>
                            <button
                                className="hover:bg-sidebar-accent
                                    focus-visible:ring-ring flex h-6 w-full
                                    min-w-0 cursor-pointer items-center gap-1
                                    rounded px-1.5 text-left text-xs
                                    transition-colors outline-none
                                    focus-visible:ring-2"
                                type="button"
                                onClick={() => onToggleGroup(group.id)}
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
                                    <BusyIcon className="ml-auto" size="sm" />
                                ) : null}
                                <span
                                    className="text-muted-foreground text-[10px]
                                        tabular-nums"
                                >
                                    {group.terminals.length}
                                </span>
                            </button>

                            {isGroupExpanded
                                ? group.terminals.map((tab) => (
                                      <button
                                          className={cn(
                                              `hover:bg-sidebar-accent
                                                focus-visible:ring-ring flex h-6
                                                w-full min-w-0 cursor-pointer
                                                items-center gap-1.5 rounded
                                                px-1.5 pl-6 text-left
                                                text-[11px] transition-colors
                                                outline-none
                                                focus-visible:ring-2`,
                                              selectedTerminalKey ===
                                                  tab.terminalKey &&
                                                  `bg-sidebar-accent
                                                    text-sidebar-accent-foreground`,
                                          )}
                                          key={tab.terminalKey}
                                          type="button"
                                          onClick={() => onSelectTerminal(tab)}
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
                className="border-sidebar-border flex h-full w-8 shrink-0
                    flex-col items-center border-l py-1"
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
    );
}
