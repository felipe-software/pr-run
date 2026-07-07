import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils/cn";

type BusyIconProps = ComponentPropsWithoutRef<"span"> & {
    size?: "sm" | "md";
};

const busyIconSizeClassName = {
    md: {
        container: "h-5 w-5",
        dot: "h-2.5 w-2.5",
    },
    sm: {
        container: "h-4 w-4",
        dot: "h-2 w-2",
    },
};

export function BusyIcon({ className, size = "md", ...props }: BusyIconProps) {
    const sizeClassName = busyIconSizeClassName[size];

    return (
        <span
            aria-label="Busy terminal"
            className={cn(
                `bg-success/15 text-success grid flex-none place-items-center
                rounded-md`,
                sizeClassName.container,
                className,
            )}
            role="img"
            title="Busy terminal"
            {...props}
        >
            <span
                className={cn(
                    "bg-success ring-success/25 rounded-full ring-2",
                    sizeClassName.dot,
                )}
            />
        </span>
    );
}
