import type { ReactNode } from "react";

type SidebarShellProps = {
    children: ReactNode;
    sidebarWidth: number;
};

export function SidebarShell({ children, sidebarWidth }: SidebarShellProps) {
    return (
        <aside
            className="border-sidebar-border bg-sidebar text-sidebar-foreground
                relative flex h-full min-h-0 shrink-0 flex-col border-r
                shadow-sm/5"
            style={{ width: `${sidebarWidth}px` }}
        >
            {children}
        </aside>
    );
}
