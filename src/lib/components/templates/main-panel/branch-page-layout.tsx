import { autoAnimate, type AutoAnimationPlugin } from "@formkit/auto-animate";
import { ArrowDown } from "lucide-react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

import {
    isActivityNearBottom,
    resolveActivityHeaderCompact,
    resolveActivityRefreshAction,
} from "@/lib/components/templates/main-panel/activity/activity-scroll";
import { Button } from "@/lib/components/ui/button";

type BranchPageLayoutProps = {
    children: ReactNode;
    contentVersion?: string;
    isReading: boolean;
    isReadingReady: boolean;
    renderHeader: (isCompact: boolean) => ReactNode;
    scrollKey: string;
    tabs: ReactNode;
};

const activityHeaderAnimation: AutoAnimationPlugin = (element, action) => {
    if (action === "remove") {
        return new KeyframeEffect(
            element,
            [
                { opacity: 1, transform: "translateY(0)" },
                { opacity: 0, transform: "translateY(-3px)" },
            ],
            { duration: 150, easing: "ease-in" },
        );
    }

    if (action === "add") {
        return new KeyframeEffect(
            element,
            [
                { opacity: 0, transform: "translateY(3px)" },
                { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 180, easing: "ease-out" },
        );
    }

    return new KeyframeEffect(element, [{ opacity: 1 }, { opacity: 1 }], {
        duration: 180,
    });
};

export function BranchPageLayout({
    children,
    contentVersion,
    isReading,
    isReadingReady,
    renderHeader,
    scrollKey,
    tabs,
}: BranchPageLayoutProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const initializedKeyRef = useRef<string | undefined>(undefined);
    const previousVersionRef = useRef<string | undefined>(undefined);
    const wasNearBottomRef = useRef(true);
    const [hasNewActivity, setHasNewActivity] = useState(false);
    const [isCompact, setIsCompact] = useState(false);

    useLayoutEffect(() => {
        if (isReading) {
            return;
        }

        initializedKeyRef.current = undefined;
        previousVersionRef.current = undefined;
        wasNearBottomRef.current = true;
        setHasNewActivity(false);
        setIsCompact(false);
    }, [isReading]);

    useLayoutEffect(() => {
        if (!isReading || !isReadingReady || !viewportRef.current) {
            return;
        }

        const viewport = viewportRef.current;
        const isInitialized = initializedKeyRef.current === scrollKey;

        if (isInitialized && previousVersionRef.current === contentVersion) {
            return;
        }

        const action = resolveActivityRefreshAction({
            isInitialized,
            wasNearBottom: wasNearBottomRef.current,
        });

        if (action === "initialize" || action === "pin") {
            viewport.scrollTop = viewport.scrollHeight;
            wasNearBottomRef.current = true;
            setIsCompact((current) =>
                resolveActivityHeaderCompact(current, viewport.scrollTop),
            );
            setHasNewActivity(false);
        } else {
            setHasNewActivity(true);
        }

        initializedKeyRef.current = scrollKey;
        previousVersionRef.current = contentVersion;
    }, [contentVersion, isReading, isReadingReady, scrollKey]);

    useLayoutEffect(() => {
        if (
            !isReading ||
            !isReadingReady ||
            !contentRef.current ||
            !viewportRef.current
        ) {
            return;
        }

        const content = contentRef.current;
        const viewport = viewportRef.current;
        const observer = new ResizeObserver(() => {
            if (wasNearBottomRef.current) {
                viewport.scrollTop = viewport.scrollHeight;
            }
        });

        observer.observe(content);

        return () => observer.disconnect();
    }, [isReading, isReadingReady, scrollKey]);

    function handleScroll() {
        const viewport = viewportRef.current;

        if (!viewport) {
            return;
        }

        const isNearBottom = isActivityNearBottom(viewport);
        wasNearBottomRef.current = isNearBottom;
        setIsCompact((current) =>
            resolveActivityHeaderCompact(current, viewport.scrollTop),
        );

        if (isNearBottom) {
            setHasNewActivity(false);
        }
    }

    function scrollToLatestActivity() {
        viewportRef.current?.scrollTo({
            behavior: "smooth",
            top: viewportRef.current.scrollHeight,
        });
        wasNearBottomRef.current = true;
        setHasNewActivity(false);
    }

    if (!isReading) {
        return (
            <div
                className="flex min-h-0 w-full flex-1 flex-col gap-3
                    max-[500px]:min-h-[500px]"
            >
                <div className="flex shrink-0 flex-col gap-0">
                    {renderHeader(false)}
                    {tabs}
                </div>
                <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-0 w-full flex-1">
            <div
                className="relative min-h-0 w-full flex-1 overflow-y-auto
                    [overflow-anchor:none]"
                ref={viewportRef}
                onScroll={handleScroll}
            >
                <div
                    className="bg-background/95 sticky top-0 z-20
                        backdrop-blur-sm transition-colors duration-200"
                >
                    <AnimatedHeader isCompact={isCompact}>
                        {renderHeader(isCompact)}
                    </AnimatedHeader>
                    {tabs}
                </div>
                <div ref={contentRef}>{children}</div>
            </div>
            {hasNewActivity ? (
                <Button
                    className="absolute right-4 bottom-4 z-20 shadow-md/15"
                    size="sm"
                    type="button"
                    onClick={scrollToLatestActivity}
                >
                    <ArrowDown className="size-3.5" />
                    New activity
                </Button>
            ) : null}
        </div>
    );
}

function AnimatedHeader({
    children,
    isCompact,
}: {
    children: ReactNode;
    isCompact: boolean;
}) {
    const headerRef = useRef<HTMLDivElement>(null);
    const heightAnimationRef = useRef<Animation | null>(null);
    const previousHeightRef = useRef<number | null>(null);

    useLayoutEffect(() => {
        const header = headerRef.current;

        if (!header) {
            return;
        }

        const controller = autoAnimate(header, activityHeaderAnimation);

        return () => {
            controller.destroy?.();
            heightAnimationRef.current?.cancel();
        };
    }, []);

    useLayoutEffect(() => {
        const header = headerRef.current;
        const activeChild = header?.firstElementChild;

        if (!header || !activeChild) {
            return;
        }

        const targetHeight = activeChild.getBoundingClientRect().height;
        const currentHeight = heightAnimationRef.current
            ? header.getBoundingClientRect().height
            : (previousHeightRef.current ?? targetHeight);

        heightAnimationRef.current?.cancel();
        previousHeightRef.current = targetHeight;

        if (
            currentHeight === targetHeight ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            heightAnimationRef.current = null;
            return;
        }

        const animation = header.animate(
            [{ height: `${currentHeight}px` }, { height: `${targetHeight}px` }],
            { duration: 180, easing: "ease-in-out" },
        );

        heightAnimationRef.current = animation;
        animation.addEventListener(
            "finish",
            () => {
                if (heightAnimationRef.current === animation) {
                    heightAnimationRef.current = null;
                }
            },
            { once: true },
        );
    }, [isCompact]);

    return (
        <div ref={headerRef}>
            <div key={isCompact ? "compact" : "expanded"}>{children}</div>
        </div>
    );
}
