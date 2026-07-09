import { FilePlus2, KeyRound, Plus, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/lib/components/ui/button";
import {
    Tooltip,
    TooltipPopup,
    TooltipTrigger,
} from "@/lib/components/ui/tooltip";

type SidebarHeaderProps = {
    isCreatingScript: boolean;
    onAddProject: () => void;
    onCreateScript: () => void;
    onOpenSshPassphrase: () => void;
    onOpenSettings: () => void;
};

export function SidebarHeader({
    isCreatingScript,
    onAddProject,
    onCreateScript,
    onOpenSshPassphrase,
    onOpenSettings,
}: SidebarHeaderProps) {
    return (
        <header
            className="border-sidebar-border/70 flex min-h-11 items-center
                justify-between gap-3 border-b px-2.5 py-2"
        >
            <div className="min-w-0">
                <div
                    className="text-sidebar-foreground truncate text-[13px]
                        font-semibold tracking-tight"
                >
                    PR Run
                </div>
                <div
                    className="text-muted-foreground/55 truncate font-mono
                        text-[10px] leading-3"
                >
                    branches + worktrees
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <HeaderAction
                    disabled={isCreatingScript}
                    label="Create script"
                    onClick={onCreateScript}
                >
                    <FilePlus2 className="size-4" />
                </HeaderAction>
                <HeaderAction
                    label="SSH passphrase"
                    onClick={onOpenSshPassphrase}
                >
                    <KeyRound className="size-4" />
                </HeaderAction>
                <HeaderAction label="Settings" onClick={() => onOpenSettings()}>
                    <Settings className="size-4" />
                </HeaderAction>
                <HeaderAction label="Add project" onClick={onAddProject}>
                    <Plus className="size-4" />
                </HeaderAction>
            </div>
        </header>
    );
}

function HeaderAction({
    children,
    disabled,
    label,
    onClick,
}: {
    children: ReactNode;
    disabled?: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Button
                        aria-label={label}
                        className="text-muted-foreground/75"
                        disabled={disabled}
                        size="icon-xs"
                        variant="ghost"
                        onClick={onClick}
                    />
                }
            >
                {children}
            </TooltipTrigger>
            <TooltipPopup>{label}</TooltipPopup>
        </Tooltip>
    );
}
