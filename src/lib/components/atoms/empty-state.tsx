import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
    actions?: ReactNode;
    className?: string;
    description: ReactNode;
    icon?: ReactNode;
    title: ReactNode;
};

export function EmptyState({
    actions,
    className,
    description,
    icon,
    title,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center p-6 text-center",
                className,
            )}
        >
            {icon ? (
                <div className="relative mb-5 flex size-10 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground shadow-sm/5 before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] before:shadow-[0_1px_rgba(255,255,255,0.08)]">
                    {icon}
                </div>
            ) : null}
            <div className="max-w-sm text-balance text-base font-semibold text-foreground">
                {title}
            </div>
            <div className="mt-1 max-w-sm text-balance text-sm leading-6 text-muted-foreground">
                {description}
            </div>
            {actions ? <div className="mt-5 flex gap-2">{actions}</div> : null}
        </div>
    );
}
