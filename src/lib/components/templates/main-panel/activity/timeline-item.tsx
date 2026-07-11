import type { ReactNode } from "react";

import type { ActivitySide } from "@/lib/components/templates/main-panel/activity/activity-side";
import { cn } from "@/lib/utils/cn";

type TimelineItemProps = {
    children: ReactNode;
    className?: string;
    connectToSpine?: boolean;
    marker: ReactNode;
    markerClassName?: string;
    side?: ActivitySide;
};

export function TimelineItem({
    children,
    className,
    connectToSpine = true,
    marker,
    markerClassName,
    side = "neutral",
}: TimelineItemProps) {
    const isRight = side === "right";

    return (
        <div
            className={cn("relative min-w-0", className)}
            data-side={side}
            data-timeline-item=""
        >
            <div
                className={cn(
                    `border-border bg-background absolute top-2 z-10 flex size-8
                    items-center justify-center rounded-lg border shadow-sm/5`,
                    isRight ? "right-0" : "left-0",
                    markerClassName,
                )}
                data-timeline-node={connectToSpine ? "" : undefined}
            >
                {marker}
            </div>
            <div
                className={cn(
                    "min-w-0",
                    side === "neutral" && "ml-12",
                    side === "left" && "ml-12 flex justify-start",
                    isRight && "mr-12 flex justify-end",
                )}
            >
                {children}
            </div>
        </div>
    );
}
