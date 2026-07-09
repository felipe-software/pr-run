import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useState } from "react";

import { Button } from "@/lib/components/ui/button";
import { cn } from "@/lib/utils/cn";

type SidebarContextValue = {
    isOpen: boolean;
    setOpen: (isOpen: boolean) => void;
    toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
    children,
    defaultOpen = true,
    className,
}: {
    children: ReactNode;
    className?: string;
    defaultOpen?: boolean;
}) {
    const [isOpen, setOpen] = useState(defaultOpen);
    return (
        <SidebarContext.Provider
            value={{ isOpen, setOpen, toggle: () => setOpen((open) => !open) }}
        >
            <div
                className={cn("flex min-h-0", className)}
                data-slot="sidebar-wrapper"
            >
                {children}
            </div>
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context)
        throw new Error("useSidebar must be used within a SidebarProvider.");
    return context;
}

export function Sidebar({ className, ...props }: ComponentProps<"aside">) {
    const { isOpen } = useSidebar();
    return (
        <aside
            className={cn(
                `border-sidebar-border bg-sidebar text-sidebar-foreground
                relative flex min-h-0 shrink-0 flex-col border-r`,
                !isOpen && "hidden",
                className,
            )}
            data-slot="sidebar"
            {...props}
        />
    );
}

export function SidebarHeader(props: ComponentProps<"header">) {
    return <header data-slot="sidebar-header" {...props} />;
}
export function SidebarContent({ className, ...props }: ComponentProps<"div">) {
    return (
        <div
            className={cn("min-h-0 flex-1 overflow-auto", className)}
            data-slot="sidebar-content"
            {...props}
        />
    );
}
export function SidebarFooter(props: ComponentProps<"footer">) {
    return <footer data-slot="sidebar-footer" {...props} />;
}
export function SidebarGroup(props: ComponentProps<"section">) {
    return <section data-slot="sidebar-group" {...props} />;
}
export function SidebarMenu({ className, ...props }: ComponentProps<"ul">) {
    return (
        <ul
            className={cn("grid gap-0.5", className)}
            data-slot="sidebar-menu"
            {...props}
        />
    );
}
export function SidebarMenuItem(props: ComponentProps<"li">) {
    return <li data-slot="sidebar-menu-item" {...props} />;
}
export function SidebarMenuButton({
    className,
    ...props
}: ComponentProps<typeof Button>) {
    return (
        <Button
            className={cn("w-full justify-start", className)}
            data-slot="sidebar-menu-button"
            size="sm"
            variant="ghost"
            {...props}
        />
    );
}
export function SidebarMenuSub({ className, ...props }: ComponentProps<"ul">) {
    return (
        <ul
            className={cn(
                "border-sidebar-border ml-3 grid gap-0.5 border-l pl-1.5",
                className,
            )}
            data-slot="sidebar-menu-sub"
            {...props}
        />
    );
}
export function SidebarMenuSubItem(props: ComponentProps<"li">) {
    return <li data-slot="sidebar-menu-sub-item" {...props} />;
}
export function SidebarMenuSubButton({
    className,
    ...props
}: ComponentProps<typeof Button>) {
    return (
        <Button
            className={cn("w-full justify-start", className)}
            data-slot="sidebar-menu-sub-button"
            size="xs"
            variant="ghost"
            {...props}
        />
    );
}
export function SidebarRail({ className, ...props }: ComponentProps<"button">) {
    return (
        <button
            aria-label="Resize sidebar"
            className={cn(
                `absolute inset-y-0 -right-1.5 z-20 hidden w-3 cursor-col-resize
                md:block`,
                className,
            )}
            data-slot="sidebar-rail"
            type="button"
            {...props}
        />
    );
}
export function SidebarTrigger({
    className,
    ...props
}: ComponentProps<typeof Button>) {
    const { toggle } = useSidebar();
    return (
        <Button
            aria-label="Toggle sidebar"
            className={className}
            size="icon-sm"
            variant="ghost"
            onClick={toggle}
            {...props}
        />
    );
}
