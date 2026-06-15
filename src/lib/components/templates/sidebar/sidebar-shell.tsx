import type { ReactNode } from "react";

type SidebarShellProps = {
    children: ReactNode;
    sidebarWidth: number;
};

export function SidebarShell({ children, sidebarWidth }: SidebarShellProps) {
    return (
        <aside
            className="relative flex h-screen min-h-0 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground [font-family:'SF_Pro_Display','Geist_Sans','Helvetica_Neue','Avenir_Next','Segoe_UI',sans-serif]"
            style={{ width: `${sidebarWidth}px` }}
        >
            {children}
        </aside>
    );
}
