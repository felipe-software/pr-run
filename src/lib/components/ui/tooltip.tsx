import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { cn } from "@/lib/utils/cn";

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;

function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
    return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipPopup({
    align = "center",
    children,
    className,
    side = "top",
    sideOffset = 5,
    ...props
}: TooltipPrimitive.Popup.Props & {
    align?: TooltipPrimitive.Positioner.Props["align"];
    side?: TooltipPrimitive.Positioner.Props["side"];
    sideOffset?: TooltipPrimitive.Positioner.Props["sideOffset"];
}) {
    return (
        <TooltipPrimitive.Portal>
            <TooltipPrimitive.Positioner
                align={align}
                className="z-50"
                side={side}
                sideOffset={sideOffset}
            >
                <TooltipPrimitive.Popup
                    className={cn(
                        `bg-popover text-popover-foreground rounded-md border
                        px-2 py-1 text-xs shadow-md/10
                        transition-[opacity,scale] data-ending-style:scale-95
                        data-ending-style:opacity-0 data-starting-style:scale-95
                        data-starting-style:opacity-0`,
                        className as string | undefined,
                    )}
                    data-slot="tooltip-popup"
                    {...props}
                >
                    {children}
                </TooltipPrimitive.Popup>
            </TooltipPrimitive.Positioner>
        </TooltipPrimitive.Portal>
    );
}

export { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger };
