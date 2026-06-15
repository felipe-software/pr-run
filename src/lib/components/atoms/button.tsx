import { Button as HeroButton } from "@heroui/react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonProps = ComponentProps<typeof HeroButton> & {
    tone?: "primary" | "ghost";
};

export function Button({
    className,
    isIconOnly,
    tone = "ghost",
    ...props
}: ButtonProps) {
    const baseClassName = cn(
        "rounded border text-foreground shadow-none transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
        "border-border bg-transparent text-xs font-semibold tracking-[0.01em] data-[hover=true]:border-foreground data-[hover=true]:bg-muted/20 data-[hover=true]:text-foreground",
        isIconOnly ? "min-w-0 px-0" : "min-h-9 px-3",
    );
    const toneClassName =
        tone === "primary"
            ? "border-foreground bg-foreground text-background data-[hover=true]:bg-foreground/90 data-[hover=true]:text-background"
            : "";

    return (
        <HeroButton
            className={
                typeof className === "function"
                    ? (values) =>
                          cn(baseClassName, toneClassName, className(values))
                    : cn(baseClassName, toneClassName, className)
            }
            isIconOnly={isIconOnly}
            variant="ghost"
            {...props}
        />
    );
}
