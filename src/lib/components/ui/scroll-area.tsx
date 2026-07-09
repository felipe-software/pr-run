import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type * as React from "react";

import { cn } from "@/lib/utils/cn";

export function ScrollArea({
    children,
    className,
    ...props
}: ScrollAreaPrimitive.Root.Props & { children: React.ReactNode }) {
    return (
        <ScrollAreaPrimitive.Root
            className={cn("min-h-0", className as string | undefined)}
            data-slot="scroll-area"
            {...props}
        >
            <ScrollAreaPrimitive.Viewport className="size-full overflow-auto">
                <ScrollAreaPrimitive.Content>
                    {children}
                </ScrollAreaPrimitive.Content>
            </ScrollAreaPrimitive.Viewport>
        </ScrollAreaPrimitive.Root>
    );
}
