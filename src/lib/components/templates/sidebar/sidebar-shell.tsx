import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type SidebarShellProps = {
    children: ReactNode;
    isDesktopHidden?: boolean;
    isMobileOpen?: boolean;
};

export function SidebarShell({
    children,
    isDesktopHidden = false,
    isMobileOpen = false,
}: SidebarShellProps) {
    return (
        <div
            className="relative h-full shrink-0 max-lg:contents"
            data-slot="sidebar-root"
        >
            <div
                aria-hidden="true"
                className="relative hidden h-full bg-transparent
                    transition-[width] duration-200 ease-linear lg:block"
                data-slot="sidebar-gap"
                style={{
                    width: isDesktopHidden ? "0px" : "var(--sidebar-width)",
                }}
            />
            <aside
                className={cn(
                    `border-sidebar-border bg-sidebar text-sidebar-foreground
                    relative flex h-full min-h-0 shrink-0 flex-col
                    overflow-hidden border-r shadow-sm/5 lg:absolute
                    lg:inset-y-0 lg:left-0 lg:flex lg:transition-transform
                    lg:duration-200 lg:ease-linear`,
                    isMobileOpen ? "max-lg:flex" : "max-lg:hidden",
                    isDesktopHidden
                        ? "lg:pointer-events-none lg:-translate-x-full"
                        : "lg:translate-x-0",
                )}
                data-slot="sidebar-panel"
                inert={isDesktopHidden}
                style={{ width: "var(--sidebar-width)" }}
            >
                {children}
            </aside>
        </div>
    );
}
