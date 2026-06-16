import type { ReactNode } from "react";

type SidebarShellProps = {
    children: ReactNode;
    sidebarWidth: number;
};

export function SidebarShell({ children, sidebarWidth }: SidebarShellProps) {
    return (
        <aside
            className="relative flex h-dvh min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm/5"
            style={{ width: `${sidebarWidth}px` }}
        >
            {children}
        </aside>
    );
}
