import type * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "animate-skeleton bg-muted/70 rounded-md bg-[length:200%_100%]",
                className,
            )}
            data-slot="skeleton"
            {...props}
        />
    );
}
