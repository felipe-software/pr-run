import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { isValidElement } from "react";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
    "focus-visible:ring-ring focus-visible:ring-offset-background relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-[background,color,border-color,box-shadow,transform] outline-none before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius)-1px)] focus-visible:ring-2 focus-visible:ring-offset-1 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 disabled:active:scale-100 pointer-coarse:after:absolute pointer-coarse:after:size-full pointer-coarse:after:min-h-11 pointer-coarse:after:min-w-11 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4",
    {
        defaultVariants: { size: "default", variant: "default" },
        variants: {
            size: {
                default: "h-8 px-2.5",
                xs: "h-6 rounded-md px-2 text-xs",
                sm: "h-7 px-2.5 text-xs",
                lg: "h-9 px-3",
                icon: "size-8 p-0",
                "icon-xs":
                    "size-6 rounded-md p-0 [&_svg:not([class*='size-'])]:size-3.5",
                "icon-sm": "size-7 p-0",
                "icon-lg": "size-9 p-0",
            },
            variant: {
                default:
                    "border-primary bg-primary text-primary-foreground [:hover,[data-pressed]]:bg-primary/90 shadow-sm/10",
                destructive:
                    "border-destructive bg-destructive [:hover,[data-pressed]]:bg-destructive/90 text-white shadow-sm/10",
                "destructive-outline":
                    "border-destructive/35 bg-popover text-destructive-foreground [:hover,[data-pressed]]:bg-destructive/10",
                ghost: "text-foreground [:hover,[data-pressed]]:bg-accent [&_svg:not([class*='text-'])]:text-muted-foreground border-transparent bg-transparent",
                link: "text-primary border-transparent underline-offset-4 [:hover,[data-pressed]]:underline",
                outline:
                    "border-input bg-popover text-foreground [:hover,[data-pressed]]:bg-accent/60 [&_svg:not([class*='text-'])]:text-muted-foreground shadow-sm/5",
                secondary:
                    "bg-secondary text-secondary-foreground [:hover,[data-pressed]]:bg-secondary/80 border-transparent",
            },
        },
    },
);

export type ButtonProps = useRender.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants>;

export function Button({
    className,
    render,
    size,
    type: explicitType,
    variant,
    ...props
}: ButtonProps) {
    const type = resolveButtonType(render, explicitType);

    return useRender({
        defaultTagName: "button",
        props: mergeProps<"button">(
            {
                className: cn(buttonVariants({ className, size, variant })),
                "data-slot": "button",
                type,
            } as never,
            props,
        ),
        render,
    });
}

export function resolveButtonType(
    render: ButtonProps["render"],
    explicitType?: ButtonProps["type"],
) {
    if (explicitType) {
        return explicitType;
    }

    if (!render || (isValidElement(render) && render.type === "button")) {
        return "button";
    }

    return undefined;
}

export { buttonVariants };
