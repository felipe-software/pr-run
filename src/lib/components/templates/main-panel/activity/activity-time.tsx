import { useEffect, useState } from "react";

import {
    formatActivityAbsoluteTime,
    formatActivityRelativeTime,
    getActivityTimeRefreshDelay,
} from "@/lib/components/templates/main-panel/activity/activity-date";
import {
    Tooltip,
    TooltipPopup,
    TooltipTrigger,
} from "@/lib/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

type ActivityTimeProps = {
    className?: string;
    value: string;
};

export function ActivityTime({ className, value }: ActivityTimeProps) {
    const [now, setNow] = useState(Date.now());
    const relativeTime = formatActivityRelativeTime(value, now);
    const absoluteTime = formatActivityAbsoluteTime(value);

    useEffect(() => {
        const delay = getActivityTimeRefreshDelay(value, now);

        if (delay === null) {
            return;
        }

        const timeout = window.setTimeout(() => setNow(Date.now()), delay);

        return () => window.clearTimeout(timeout);
    }, [now, value]);

    return (
        <Tooltip>
            <TooltipTrigger
                delay={0}
                render={
                    <time
                        aria-label={absoluteTime}
                        className={cn(
                            `focus-visible:ring-ring cursor-default rounded-sm
                            outline-none focus-visible:ring-2`,
                            className,
                        )}
                        dateTime={value}
                        tabIndex={0}
                    />
                }
            >
                {relativeTime}
            </TooltipTrigger>
            <TooltipPopup>{absoluteTime}</TooltipPopup>
        </Tooltip>
    );
}
