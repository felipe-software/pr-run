import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

import { cn } from "@/lib/utils/cn";

export type InputProps = Omit<
    InputPrimitive.Props & React.RefAttributes<HTMLInputElement>,
    "size"
> & { size?: "sm" | "default" | "lg" };

export function Input({ className, size = "default", ...props }: InputProps) {
    return (
        <span
            className={cn(
                `border-input bg-background text-foreground
                has-[aria-invalid=true]:border-destructive/60
                has-[:focus-visible]:border-ring
                has-[:focus-visible]:ring-ring/30 dark:bg-input/30 relative
                inline-flex w-full rounded-lg border shadow-sm/5
                transition-shadow has-[:disabled]:opacity-60
                has-[:focus-visible]:ring-2`,
                className as string | undefined,
            )}
            data-slot="input-control"
        >
            <InputPrimitive
                className={cn(
                    `placeholder:text-muted-foreground/70 w-full min-w-0
                    rounded-[inherit] bg-transparent px-3 outline-none`,
                    size === "sm"
                        ? "h-7 text-xs"
                        : size === "lg"
                          ? "h-10"
                          : "h-8 text-sm",
                )}
                data-slot="input"
                {...props}
            />
        </span>
    );
}
