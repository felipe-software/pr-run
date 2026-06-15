import type { ReactNode } from "react";

type SidebarContentProps = {
    children: ReactNode;
};

export function SidebarContent({ children }: SidebarContentProps) {
    return (
        <div className="min-h-0 flex-1 overflow-auto px-1 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-0 flex-col gap-0.5 py-1">{children}</div>
        </div>
    );
}
