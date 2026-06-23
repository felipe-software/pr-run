import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils/cn";

type StatusPillTone =
    | "branch"
    | "busy"
    | "custom"
    | "error"
    | "idle"
    | "pull-request"
    | "stale"
    | "worktree";

type StatusPillProps = ComponentPropsWithoutRef<"span"> & {
    tone: StatusPillTone;
};

const statusPillClassName: Record<StatusPillTone, string> = {
    branch: "border-border bg-muted/35 text-muted-foreground",
    busy: "border-success/25 bg-success/12 text-success-foreground",
    custom: "",
    error: "border-danger/25 bg-danger/12 text-danger-foreground",
    idle: "border-border bg-muted/25 text-muted-foreground",
    "pull-request":
        "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    stale: "border-warning/25 bg-warning/10 text-warning-foreground",
    worktree: "border-success/25 bg-success/10 text-success-foreground",
};

export function StatusPill({ className, tone, ...props }: StatusPillProps) {
    return (
        <span
            className={cn(
                `inline-flex h-5 min-w-0 shrink-0 items-center gap-1 rounded-md
                border px-1.5 text-[10px] leading-none font-medium`,
                statusPillClassName[tone],
                className,
            )}
            {...props}
        />
    );
}
