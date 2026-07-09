import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";

import { cn } from "@/lib/utils/cn";

export function Separator({
    className,
    orientation = "horizontal",
    ...props
}: SeparatorPrimitive.Props) {
    return (
        <SeparatorPrimitive
            className={cn(
                "bg-border shrink-0",
                orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
                className as string | undefined,
            )}
            data-slot="separator"
            orientation={orientation}
            {...props}
        />
    );
}
