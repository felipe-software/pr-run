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
        <footer className="shrink-0 px-1.5 pb-1.5">
            <Button
                aria-current={isSettingsActive ? "page" : undefined}
                className={cn(
                    "h-7 w-full justify-start rounded-md px-2 text-xs",
                    isSettingsActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : `text-muted-foreground hover:bg-sidebar-accent
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
