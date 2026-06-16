import { FilePlus2, KeyRound, Moon, Plus, SunMedium } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";

type SidebarHeaderProps = {
    isCreatingScript: boolean;
    theme: "dark" | "light";
    onAddProject: () => void;
    onCreateScript: () => void;
    onOpenSshPassphrase: () => void;
    onToggleTheme: () => void;
};

export function SidebarHeader({
    isCreatingScript,
    theme,
    onAddProject,
    onCreateScript,
    onOpenSshPassphrase,
    onToggleTheme,
}: SidebarHeaderProps) {
    const actionButtonClassName =
        "border-transparent text-muted-foreground/75 data-[hover=true]:bg-sidebar-accent data-[hover=true]:text-sidebar-accent-foreground";

    return (
        <header className="flex min-h-11 items-center justify-between gap-3 border-b border-sidebar-border/70 px-2.5 py-2">
            <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold tracking-tight text-sidebar-foreground">
                    PR Run
                </div>
                <div className="truncate font-mono text-[10px] leading-3 text-muted-foreground/55">
                    branches + worktrees
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <Button
                    aria-label="Toggle theme"
                    className={actionButtonClassName}
                    isIconOnly
                    size="icon-xs"
                    type="button"
                    onPress={onToggleTheme}
                >
                    {theme === "dark" ? (
                        <SunMedium className="h-4 w-4" />
                    ) : (
                        <Moon className="h-4 w-4" />
                    )}
                </Button>
                <Button
                    aria-label="Create script"
                    className={actionButtonClassName}
                    isDisabled={isCreatingScript}
                    isIconOnly
                    size="icon-xs"
                    type="button"
                    onPress={onCreateScript}
                >
                    <FilePlus2 className="h-4 w-4" />
                </Button>
                <Button
                    aria-label="SSH passphrase"
                    className={actionButtonClassName}
                    isIconOnly
                    size="icon-xs"
                    type="button"
                    onPress={onOpenSshPassphrase}
                >
                    <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                    aria-label="Add project"
                    className={actionButtonClassName}
                    isIconOnly
                    size="icon-xs"
                    type="button"
                    onPress={onAddProject}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </header>
    );
}
