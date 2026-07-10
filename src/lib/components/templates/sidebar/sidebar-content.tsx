import type { ReactNode } from "react";

import { ScrollArea } from "@/lib/components/ui/scroll-area";

type SidebarContentProps = {
    children: ReactNode;
};

export function SidebarContent({ children }: SidebarContentProps) {
    return (
        <ScrollArea
            className="min-h-0 flex-1 px-1.5 pb-1
                [--scroll-fade-color:var(--sidebar)]"
            hideScrollbars
            scrollFade="overlay"
        >
            <div className="flex min-w-0 flex-col py-1">{children}</div>
        </ScrollArea>
    );
}
