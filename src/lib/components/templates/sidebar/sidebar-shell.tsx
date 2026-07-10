import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type SidebarShellProps = {
    children: ReactNode;
    isDesktopHidden?: boolean;
    isMobileOpen?: boolean;
    sidebarWidth: number;
};

export function SidebarShell({
    children,
    isDesktopHidden = false,
    isMobileOpen = false,
    sidebarWidth,
}: SidebarShellProps) {
    return (
        <aside
            className={cn(
                `border-sidebar-border bg-sidebar text-sidebar-foreground
                relative flex h-full min-h-0 shrink-0 flex-col border-r
                shadow-sm/5`,
                isDesktopHidden
                    ? "hidden"
                    : isMobileOpen
                      ? "max-lg:flex"
                      : "max-lg:hidden",
            )}
            style={{ width: `${sidebarWidth}px` }}
        >
            {children}
        </aside>
    );
}
