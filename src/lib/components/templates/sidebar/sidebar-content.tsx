import type { ReactNode } from "react";

type SidebarContentProps = {
    children: ReactNode;
};

export function SidebarContent({ children }: SidebarContentProps) {
    return (
        <div
            className="min-h-0 flex-1 [scrollbar-width:none] overflow-auto
                px-1.5 pb-1 [-ms-overflow-style:none]
                [&::-webkit-scrollbar]:hidden"
        >
            <div className="flex min-w-0 flex-col py-1">{children}</div>
        </div>
    );
}
