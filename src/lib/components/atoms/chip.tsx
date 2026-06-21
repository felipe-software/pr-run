import type { ComponentPropsWithoutRef, ElementType } from "react";

import { cn } from "@/lib/utils/cn";

type ChipTone = "neutral" | "success" | "danger";

type ChipProps<T extends ElementType = "span"> = {
    as?: T;
    tone?: ChipTone;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

const chipToneClassName: Record<ChipTone, string> = {
    neutral: "border-border bg-muted/10 text-foreground",
    success: "border-success/25 bg-success/10 text-success",
    danger: "border-danger/25 bg-danger/10 text-danger",
};

export function Chip<T extends ElementType = "span">({
    as,
    className,
    tone = "neutral",
    ...props
}: ChipProps<T>) {
    const Component = as ?? "span";

    return (
        <Component
            className={cn(
                `inline-flex min-w-0 items-center gap-2 rounded-md border px-2
                py-1 text-xs leading-none`,
                chipToneClassName[tone],
                className,
            )}
            {...props}
        />
    );
}
