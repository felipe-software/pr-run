import { Button as HeroButton } from "@heroui/react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonProps = Omit<
    ComponentProps<typeof HeroButton>,
    "size" | "variant"
> & {
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
    const resolvedVariant =
        variant ?? (tone === "primary" ? "primary" : "ghost");
    const resolvedSize =
        size ??
        (isIconOnly ? "icon-sm" : resolvedVariant === "primary" ? "sm" : "sm");

    return (
        <HeroButton
            className={
                typeof className === "function"
                    ? (values) =>
                          cn(
                              `focus-visible:ring-ring
                            focus-visible:ring-offset-background relative
                            inline-flex shrink-0 cursor-pointer items-center
                            justify-center gap-1.5 rounded-lg border text-xs
                            font-medium whitespace-nowrap shadow-none
                            transition-[background,border-color,color,box-shadow,transform]
                            duration-150 outline-none focus-visible:ring-2
                            focus-visible:ring-offset-1 active:scale-[0.98]
                            disabled:pointer-events-none
                            disabled:cursor-not-allowed disabled:opacity-50
                            disabled:active:scale-100
                            [&_svg]:pointer-events-none [&_svg]:shrink-0`,
                              {
                                  danger: "border-danger/35 bg-danger/10 text-danger-foreground data-[hover=true]:bg-danger/15",
                                  ghost: "text-foreground data-[hover=true]:bg-muted/35 data-[hover=true]:text-foreground border-transparent bg-transparent",
                                  outline:
                                      "border-border/90 bg-surface text-foreground data-[hover=true]:bg-muted/30 shadow-sm/5",
                                  primary:
                                      "border-primary bg-primary text-primary-foreground data-[hover=true]:bg-primary/90 shadow-sm/10",
                              }[resolvedVariant],
                              {
                                  "icon-md":
                                      "size-9 min-w-9 px-0 [&_svg:not([class*='h-'])]:size-4",
                                  "icon-sm":
                                      "size-8 min-w-8 px-0 [&_svg:not([class*='h-'])]:size-4",
                                  "icon-xs":
                                      "size-7 min-w-7 rounded-md px-0 [&_svg:not([class*='h-'])]:size-3.5",
                                  md: "h-9 px-3",
                                  sm: "h-8 px-2.5",
                                  xs: "h-7 rounded-md px-2 text-[11px]",
                              }[resolvedSize],
                              className(values),
                          )
                    : cn(
                          `focus-visible:ring-ring
                                focus-visible:ring-offset-background relative
                                inline-flex shrink-0 cursor-pointer items-center
                                justify-center gap-1.5 rounded-lg border text-xs
                                font-medium whitespace-nowrap shadow-none
                                transition-[background,border-color,color,box-shadow,transform]
                                duration-150 outline-none focus-visible:ring-2
                                focus-visible:ring-offset-1 active:scale-[0.98]
                                disabled:pointer-events-none
                                disabled:cursor-not-allowed disabled:opacity-50
                                disabled:active:scale-100
                                [&_svg]:pointer-events-none [&_svg]:shrink-0`,
                          {
                              danger: "border-danger/35 bg-danger/10 text-danger-foreground data-[hover=true]:bg-danger/15",
                              ghost: "text-foreground data-[hover=true]:bg-muted/35 data-[hover=true]:text-foreground border-transparent bg-transparent",
                              outline:
                                  "border-border/90 bg-surface text-foreground data-[hover=true]:bg-muted/30 shadow-sm/5",
                              primary:
                                  "border-primary bg-primary text-primary-foreground data-[hover=true]:bg-primary/90 shadow-sm/10",
                          }[resolvedVariant],
                          {
                              "icon-md":
                                  "size-9 min-w-9 px-0 [&_svg:not([class*='h-'])]:size-4",
                              "icon-sm":
                                  "size-8 min-w-8 px-0 [&_svg:not([class*='h-'])]:size-4",
                              "icon-xs":
                                  "size-7 min-w-7 rounded-md px-0 [&_svg:not([class*='h-'])]:size-3.5",
                              md: "h-9 px-3",
                              sm: "h-8 px-2.5",
                              xs: "h-7 rounded-md px-2 text-[11px]",
                          }[resolvedSize],
                          className,
                      )
            }
            isIconOnly={isIconOnly}
            variant="ghost"
            {...props}
        />
    );
}
