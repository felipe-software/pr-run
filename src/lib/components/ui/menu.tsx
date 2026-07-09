import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

const Menu = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;
const MenuPortal = MenuPrimitive.Portal;

function MenuContent({ className, ...props }: MenuPrimitive.Popup.Props) {
    return (
        <MenuPortal>
            <MenuPrimitive.Positioner
                align="end"
                className="z-50"
                sideOffset={5}
            >
                <MenuPrimitive.Popup
                    className={cn(
                        `bg-popover text-popover-foreground min-w-36 rounded-lg
                        border p-1 text-sm shadow-lg/10 outline-none`,
                        className as string | undefined,
                    )}
                    data-slot="menu-popup"
                    {...props}
                />
            </MenuPrimitive.Positioner>
        </MenuPortal>
    );
}

function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
    return (
        <MenuPrimitive.Item
            className={cn(
                `data-highlighted:bg-accent flex h-8 cursor-pointer items-center
                gap-2 rounded-md px-2 text-sm outline-none
                data-disabled:pointer-events-none data-disabled:opacity-50`,
                className as string | undefined,
            )}
            data-slot="menu-item"
            {...props}
        />
    );
}

function MenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
    return (
        <MenuPrimitive.Separator
            className={cn(
                "bg-border my-1 h-px",
                className as string | undefined,
            )}
            {...props}
        />
    );
}

function MenuSubTrigger({
    children,
    className,
    ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
    return (
        <MenuPrimitive.SubmenuTrigger
            className={cn(
                `data-highlighted:bg-accent flex h-8 w-full cursor-pointer
                items-center gap-2 rounded-md px-2 text-left outline-none`,
                className as string | undefined,
            )}
            {...props}
        >
            {children}
            <ChevronRight className="ml-auto size-3.5" />
        </MenuPrimitive.SubmenuTrigger>
    );
}

export {
    Menu,
    MenuContent,
    MenuItem,
    MenuPortal,
    MenuSeparator,
    MenuSubTrigger,
    MenuTrigger,
};
