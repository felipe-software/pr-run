import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils/cn";

type BusyDotProps = ComponentPropsWithoutRef<"span">;

export function BusyDot({ className, ...props }: BusyDotProps) {
    return (
        <span
            aria-label="Busy terminal"
            className={cn(
                `bg-success ring-success/20 inline-block h-2 w-2 shrink-0
                rounded-full ring-2`,
                className,
            )}
            role="status"
            title="Busy terminal"
            {...props}
        />
    );
}
