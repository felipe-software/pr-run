import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type * as React from "react";

import { Button } from "@/lib/components/ui/button";
import { cn } from "@/lib/utils/cn";

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: DialogPrimitive.Close.Props) {
    return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogBackdrop({
    className,
    ...props
}: DialogPrimitive.Backdrop.Props) {
    return (
        <DialogPrimitive.Backdrop
            className={cn(
                `bg-background/65 fixed inset-0 z-50 backdrop-blur-sm
                transition-opacity duration-200 data-ending-style:opacity-0
                data-starting-style:opacity-0`,
                className as string | undefined,
            )}
            data-slot="dialog-backdrop"
            {...props}
        />
    );
}

function DialogViewport({
    className,
    ...props
}: DialogPrimitive.Viewport.Props) {
    return (
        <DialogPrimitive.Viewport
            className={cn(
                `fixed inset-0 z-50 grid grid-rows-[1fr_auto_1fr]
                justify-items-center p-4`,
                className as string | undefined,
            )}
            data-slot="dialog-viewport"
            {...props}
        />
    );
}

function DialogPopup({
    bottomStickOnMobile = true,
    children,
    className,
    showCloseButton = true,
    ...props
}: DialogPrimitive.Popup.Props & {
    bottomStickOnMobile?: boolean;
    showCloseButton?: boolean;
}) {
    return (
        <DialogPortal>
            <DialogBackdrop />
            <DialogViewport
                className={cn(
                    bottomStickOnMobile &&
                        "max-sm:grid-rows-[1fr_auto] max-sm:p-0 max-sm:pt-12",
                )}
            >
                <DialogPrimitive.Popup
                    className={cn(
                        `bg-popover text-popover-foreground relative row-start-2
                        flex max-h-full w-full max-w-lg flex-col rounded-xl
                        border shadow-xl/10 transition-[opacity,scale,translate]
                        duration-200 data-ending-style:scale-98
                        data-ending-style:opacity-0 data-starting-style:scale-98
                        data-starting-style:opacity-0`,
                        bottomStickOnMobile &&
                            `max-sm:max-w-none max-sm:rounded-b-none
                            max-sm:border-x-0 max-sm:border-b-0
                            max-sm:data-ending-style:translate-y-4
                            max-sm:data-starting-style:translate-y-4`,
                        className as string | undefined,
                    )}
                    data-slot="dialog-popup"
                    {...props}
                >
                    {children}
                    {showCloseButton ? (
                        <DialogPrimitive.Close
                            aria-label="Close dialog"
                            className="absolute top-2 right-2"
                            render={<Button size="icon-xs" variant="ghost" />}
                        >
                            <X />
                        </DialogPrimitive.Close>
                    ) : null}
                </DialogPrimitive.Popup>
            </DialogViewport>
        </DialogPortal>
    );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn("flex flex-col gap-1.5 px-5 pt-5 pb-3", className)}
            data-slot="dialog-header"
            {...props}
        />
    );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                `bg-muted/50 flex flex-col-reverse gap-2 border-t px-5 py-3
                sm:flex-row sm:justify-end`,
                className,
            )}
            data-slot="dialog-footer"
            {...props}
        />
    );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
    return (
        <DialogPrimitive.Title
            className={cn(
                "pr-8 text-base font-semibold tracking-tight",
                className as string | undefined,
            )}
            data-slot="dialog-title"
            {...props}
        />
    );
}

function DialogDescription({
    className,
    ...props
}: DialogPrimitive.Description.Props) {
    return (
        <DialogPrimitive.Description
            className={cn(
                "text-muted-foreground text-sm",
                className as string | undefined,
            )}
            data-slot="dialog-description"
            {...props}
        />
    );
}

function DialogPanel({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn("px-5 pb-5", className)}
            data-slot="dialog-panel"
            {...props}
        />
    );
}

export {
    Dialog,
    DialogBackdrop,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogPortal,
    DialogTitle,
    DialogTrigger,
    DialogViewport,
};
