import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
const SelectItem = SelectPrimitive.Item;

function SelectTrigger({ className, ...props }: SelectPrimitive.Trigger.Props) {
    return (
        <SelectPrimitive.Trigger
            className={cn(
                `border-input bg-background focus-visible:ring-ring/30 flex h-8
                w-full items-center justify-between rounded-lg border px-2.5
                text-sm outline-none focus-visible:ring-2`,
                className as string | undefined,
            )}
            data-slot="select-trigger"
            {...props}
        >
            <SelectPrimitive.Value />
            <ChevronDown className="text-muted-foreground size-4" />
        </SelectPrimitive.Trigger>
    );
}

function SelectContent({
    children,
    className,
    ...props
}: SelectPrimitive.Popup.Props) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Positioner
                align="start"
                className="z-50"
                sideOffset={5}
            >
                <SelectPrimitive.Popup
                    className={cn(
                        `bg-popover text-popover-foreground
                        min-w-[var(--anchor-width)] rounded-lg border p-1
                        shadow-lg/10`,
                        className as string | undefined,
                    )}
                    data-slot="select-popup"
                    {...props}
                >
                    <SelectPrimitive.List>{children}</SelectPrimitive.List>
                </SelectPrimitive.Popup>
            </SelectPrimitive.Positioner>
        </SelectPrimitive.Portal>
    );
}

function SelectOption({
    children,
    className,
    ...props
}: SelectPrimitive.Item.Props) {
    return (
        <SelectPrimitive.Item
            className={cn(
                `data-highlighted:bg-accent flex h-8 cursor-pointer items-center
                gap-2 rounded-md px-2 text-sm outline-none`,
                className as string | undefined,
            )}
            {...props}
        >
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator className="ml-auto">
                <Check className="size-3.5" />
            </SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>
    );
}

export {
    Select,
    SelectContent,
    SelectItem,
    SelectOption,
    SelectTrigger,
    SelectValue,
};
