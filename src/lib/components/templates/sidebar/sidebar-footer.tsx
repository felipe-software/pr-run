import { Settings } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import { cn } from "@/lib/utils/cn";

type SidebarFooterProps = {
    isSettingsActive: boolean;
    onOpenSettings: () => void;
};

export function SidebarFooter({
    isSettingsActive,
    onOpenSettings,
}: SidebarFooterProps) {
    return (
        <footer className="border-sidebar-border shrink-0 border-t p-1.5">
            <Button
                aria-current={isSettingsActive ? "page" : undefined}
                className={cn(
                    "w-full justify-start px-2 text-xs",
                    isSettingsActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : `text-muted-foreground
                            hover:text-sidebar-accent-foreground`,
                )}
                size="sm"
                variant="ghost"
                onClick={onOpenSettings}
            >
                <Settings className="size-3.5" />
                Settings
            </Button>
        </footer>
    );
}
