import { TreeDeciduous } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils/cn";

type WorktreeIndicatorProps = ComponentPropsWithoutRef<"span"> & {
    variant?: "icon" | "label";
};

export function WorktreeIndicator({
    className,
    variant = "icon",
    ...props
}: WorktreeIndicatorProps) {
    return (
        <span
            aria-label={variant === "icon" ? "Git worktree" : undefined}
            className={cn(
                `bg-success text-background inline-flex shrink-0 items-center
                font-medium`,
                variant === "icon"
                    ? "size-4 justify-center rounded-[4px]"
                    : `h-5 justify-start gap-1 rounded-md px-1.5 text-[10px]
                        leading-none`,
                className,
            )}
            role={variant === "icon" ? "img" : undefined}
            {...props}
        >
            <TreeDeciduous
                className="size-3 shrink-0 fill-current/25"
                strokeWidth={2.75}
            />
            {variant === "label" ? <span>Git Worktree</span> : null}
        </span>
    );
}
