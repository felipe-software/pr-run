import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "@/lib/utils/cn";

type SurfaceVariant = "plain" | "panel" | "muted" | "danger" | "terminal";

type SurfaceProps<T extends ElementType = "div"> = {
    as?: T;
    variant?: SurfaceVariant;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

const surfaceVariantClassName: Record<SurfaceVariant, string> = {
    danger: "border-danger/25 bg-danger/10 text-danger-foreground",
    muted: "border-border/70 bg-muted/20 text-muted-foreground",
    panel: "border-border/80 bg-surface text-surface-foreground shadow-sm/5",
    plain: "bg-transparent text-foreground",
    terminal: "border-border bg-[#050505] text-white shadow-sm/10",
};

export function Surface<T extends ElementType = "div">({
    as,
    className,
    variant = "panel",
    ...props
}: SurfaceProps<T>) {
    const Component = as ?? "div";

    return (
        <Component
            className={cn(
                "min-w-0 rounded-lg border",
                surfaceVariantClassName[variant],
                className,
            )}
            {...props}
        />
    );
}
