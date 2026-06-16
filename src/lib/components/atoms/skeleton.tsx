import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils/cn";

export function Skeleton({
    className,
    ...props
}: ComponentPropsWithoutRef<"div">) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                "animate-skeleton rounded-md bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--foreground)_8%,transparent),transparent)] bg-[length:200%_100%]",
                "bg-muted/35",
                className,
            )}
            {...props}
        />
    );
}
