import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils/cn";

type TabShellProps = ComponentPropsWithoutRef<"div"> & {
    isActive: boolean;
    size?: "md" | "sm";
};

export function TabShell({
    children,
    className,
    isActive,
    size = "md",
    ...props
}: TabShellProps) {
    return (
        <div
            className={cn(
                `border-border -mr-px flex min-w-0 rounded-t-md border
                border-b-0 transition`,
                size === "sm" ? "h-7" : "h-8",
                isActive
                    ? "bg-surface text-foreground"
                    : `bg-background/90 text-muted-foreground hover:bg-muted/20
                        hover:text-foreground`,
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
