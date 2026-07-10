import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type * as React from "react";

import { cn } from "@/lib/utils/cn";

type ScrollFade = boolean | "end" | "overlay";

export function ScrollArea({
    children,
    className,
    hideScrollbars = false,
    scrollFade = false,
    ...props
}: ScrollAreaPrimitive.Root.Props & {
    children: React.ReactNode;
    hideScrollbars?: boolean;
    scrollFade?: ScrollFade;
}) {
    return (
        <ScrollAreaPrimitive.Root
            className={cn(
                "relative min-h-0 min-w-0 overflow-hidden",
                scrollFade === "overlay" &&
                    `after:pointer-events-none after:absolute after:inset-x-0
                    after:bottom-0 after:z-10 after:h-4
                    after:bg-[linear-gradient(to_top,var(--scroll-fade-color,var(--background))_0%,transparent_100%)]
                    after:opacity-0 after:transition-opacity
                    [&:has([data-overflow-y-end])]:after:opacity-100`,
                className as string | undefined,
            )}
            data-slot="scroll-area"
            {...props}
        >
            <ScrollAreaPrimitive.Viewport
                className={cn(
                    "size-full overflow-auto",
                    scrollFade === "end" &&
                        `mask-r-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-end)))]
                        mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))]
                        [--fade-size:1.5rem]`,
                    scrollFade === true &&
                        `mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))]
                        mask-r-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-end)))]
                        mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))]
                        mask-l-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-start)))]
                        [--fade-size:1.5rem]`,
                    hideScrollbars &&
                        `[scrollbar-width:none] [-ms-overflow-style:none]
                        [&::-webkit-scrollbar]:hidden`,
                )}
            >
                <ScrollAreaPrimitive.Content
                    className="w-full"
                    style={{ minWidth: 0 }}
                >
                    {children}
                </ScrollAreaPrimitive.Content>
            </ScrollAreaPrimitive.Viewport>
        </ScrollAreaPrimitive.Root>
    );
}
