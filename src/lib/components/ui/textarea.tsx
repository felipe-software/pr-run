import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils/cn";

export function Textarea({
    className,
    ...props
}: ComponentPropsWithoutRef<"textarea">) {
    return (
        <textarea
            className={cn(
                `border-input bg-background text-foreground
                placeholder:text-muted-foreground/70 focus-visible:border-ring
                focus-visible:ring-ring/30 min-h-20 w-full resize-y rounded-lg
                border px-3 py-2 text-sm leading-5 shadow-sm/5 transition-shadow
                outline-none focus-visible:ring-2 disabled:opacity-60`,
                className,
            )}
            {...props}
        />
    );
}
