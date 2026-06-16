import { Button as HeroButton } from "@heroui/react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonProps = Omit<ComponentProps<typeof HeroButton>, "size" | "variant"> & {
    size?: "xs" | "sm" | "md" | "icon-xs" | "icon-sm" | "icon-md";
    tone?: "primary" | "ghost";
    variant?: "danger" | "ghost" | "outline" | "primary";
};

export function Button({
    className,
    isIconOnly,
    size,
    tone,
    variant,
    ...props
}: ButtonProps) {
    const resolvedVariant = variant ?? (tone === "primary" ? "primary" : "ghost");
    const resolvedSize =
        size ??
        (isIconOnly ? "icon-sm" : resolvedVariant === "primary" ? "sm" : "sm");
    const baseClassName = cn(
        "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border text-xs font-medium shadow-none outline-none transition-[background,border-color,color,box-shadow,transform] duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.98]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    );
    const variantClassName: Record<NonNullable<ButtonProps["variant"]>, string> = {
        danger: "border-danger/35 bg-danger/10 text-danger-foreground data-[hover=true]:bg-danger/15",
        ghost: "border-transparent bg-transparent text-foreground data-[hover=true]:bg-muted/35 data-[hover=true]:text-foreground",
        outline: "border-border/90 bg-surface text-foreground shadow-sm/5 data-[hover=true]:bg-muted/30",
        primary:
            "border-primary bg-primary text-primary-foreground shadow-sm/10 data-[hover=true]:bg-primary/90",
    };
    const sizeClassName: Record<NonNullable<ButtonProps["size"]>, string> = {
        "icon-md": "size-9 min-w-9 px-0 [&_svg:not([class*='h-'])]:size-4",
        "icon-sm": "size-8 min-w-8 px-0 [&_svg:not([class*='h-'])]:size-4",
        "icon-xs": "size-7 min-w-7 rounded-md px-0 [&_svg:not([class*='h-'])]:size-3.5",
        md: "h-9 px-3",
        sm: "h-8 px-2.5",
        xs: "h-7 rounded-md px-2 text-[11px]",
    };

    return (
        <HeroButton
            className={
                typeof className === "function"
                    ? (values) =>
                          cn(
                              baseClassName,
                              variantClassName[resolvedVariant],
                              sizeClassName[resolvedSize],
                              className(values),
                          )
                    : cn(
                          baseClassName,
                          variantClassName[resolvedVariant],
                          sizeClassName[resolvedSize],
                          className,
                      )
            }
            isIconOnly={isIconOnly}
            variant="ghost"
            {...props}
        />
    );
}
