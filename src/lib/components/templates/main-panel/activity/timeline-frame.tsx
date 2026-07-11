import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

import {
    buildTimelineSpinePath,
    type TimelineSpineNode,
} from "@/lib/components/templates/main-panel/activity/timeline-spine";
import { cn } from "@/lib/utils/cn";

type TimelineFrameProps = {
    children: ReactNode;
    className?: string;
};

type TimelineSpine = {
    height: number;
    path: string;
    width: number;
};

export function TimelineFrame({ children, className }: TimelineFrameProps) {
    const frameRef = useRef<HTMLDivElement>(null);
    const [spine, setSpine] = useState<TimelineSpine>();

    useLayoutEffect(() => {
        const frame = frameRef.current;

        if (!frame) {
            return;
        }

        const observedFrame = frame;

        let animationFrame: number | undefined;
        const observedItems = new Set<HTMLElement>();

        function updateSpine() {
            const frameBounds = observedFrame.getBoundingClientRect();
            const nodes = Array.from(
                observedFrame.querySelectorAll<HTMLElement>(
                    "[data-timeline-node]",
                ),
            ).flatMap((marker): TimelineSpineNode[] => {
                const item = marker.closest<HTMLElement>(
                    "[data-timeline-item]",
                );

                if (!item) {
                    return [];
                }

                const markerBounds = marker.getBoundingClientRect();
                const itemBounds = item.getBoundingClientRect();

                if (
                    markerBounds.width === 0 ||
                    markerBounds.height === 0 ||
                    itemBounds.height === 0
                ) {
                    return [];
                }

                return [
                    {
                        bottom: itemBounds.bottom - frameBounds.top,
                        top: itemBounds.top - frameBounds.top,
                        x:
                            markerBounds.left -
                            frameBounds.left +
                            markerBounds.width / 2,
                        y:
                            markerBounds.top -
                            frameBounds.top +
                            markerBounds.height / 2,
                    },
                ];
            });
            const nextSpine = {
                height: frameBounds.height,
                path: buildTimelineSpinePath(nodes),
                width: frameBounds.width,
            };

            setSpine((currentSpine) =>
                currentSpine?.height === nextSpine.height &&
                currentSpine.path === nextSpine.path &&
                currentSpine.width === nextSpine.width
                    ? currentSpine
                    : nextSpine,
            );
        }

        function scheduleSpineUpdate() {
            if (animationFrame !== undefined) {
                cancelAnimationFrame(animationFrame);
            }

            animationFrame = requestAnimationFrame(() => {
                animationFrame = undefined;
                updateSpine();
            });
        }

        const resizeObserver = new ResizeObserver(scheduleSpineUpdate);

        function syncObservedItems() {
            const items = new Set(
                observedFrame.querySelectorAll<HTMLElement>(
                    "[data-timeline-item]",
                ),
            );

            observedItems.forEach((item) => {
                if (!items.has(item)) {
                    resizeObserver.unobserve(item);
                    observedItems.delete(item);
                }
            });

            items.forEach((item) => {
                if (!observedItems.has(item)) {
                    observedItems.add(item);
                    resizeObserver.observe(item);
                }
            });
        }

        const mutationObserver = new MutationObserver(() => {
            syncObservedItems();
            scheduleSpineUpdate();
        });

        resizeObserver.observe(observedFrame);
        syncObservedItems();
        mutationObserver.observe(observedFrame, {
            attributeFilter: ["data-side"],
            attributes: true,
            childList: true,
            subtree: true,
        });
        updateSpine();

        return () => {
            if (animationFrame !== undefined) {
                cancelAnimationFrame(animationFrame);
            }

            mutationObserver.disconnect();
            resizeObserver.disconnect();
        };
    }, []);

    return (
        <div className={cn("relative px-3 py-3", className)} ref={frameRef}>
            {spine?.path ? (
                <svg
                    aria-hidden="true"
                    className="text-foreground/40 pointer-events-none absolute
                        inset-0 h-full w-full"
                    fill="none"
                    preserveAspectRatio="none"
                    viewBox={`0 0 ${spine.width} ${spine.height}`}
                >
                    <path
                        d={spine.path}
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            ) : null}
            {children}
        </div>
    );
}
