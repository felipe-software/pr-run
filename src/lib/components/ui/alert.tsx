import type * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Alert({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "destructive" }) {
    return (
        <div
            className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                variant === "destructive" &&
                    `border-destructive/35 bg-destructive/10
                    text-destructive-foreground`,
                variant === "default" &&
                    "border-border bg-muted/30 text-foreground",
                className,
            )}
            data-slot="alert"
            role="alert"
            {...props}
        />
    );
}
