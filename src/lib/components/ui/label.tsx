import { useRender } from "@base-ui/react/use-render";

import { cn } from "@/lib/utils/cn";

export function Label({
    className,
    ...props
}: useRender.ComponentProps<"label">) {
    return useRender({
        defaultTagName: "label",
        props: {
            className: cn("text-foreground text-sm font-medium", className),
            "data-slot": "label",
            ...props,
        },
    });
}
