import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type * as React from "react";

import { cn } from "@/lib/utils/cn";

export function ScrollArea({
    children,
    className,
    hideScrollbars = false,
    scrollFade = false,
    ...props
}: ScrollAreaPrimitive.Root.Props & {
    children: React.ReactNode;
    hideScrollbars?: boolean;
    scrollFade?: boolean;
}) {
    return (
        <ScrollAreaPrimitive.Root
            className={cn(
                "min-h-0 min-w-0 overflow-hidden",
                className as string | undefined,
            )}
            data-slot="scroll-area"
            {...props}
        >
            <ScrollAreaPrimitive.Viewport
                className={cn(
                    "size-full overflow-auto",
                    scrollFade &&
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
