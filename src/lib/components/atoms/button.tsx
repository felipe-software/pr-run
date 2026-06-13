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
    const baseClassName = isIconOnly ? "app-icon-button" : "app-button";
    const toneClassName =
        tone === "primary" ? "app-button-primary" : "app-button-ghost";

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
