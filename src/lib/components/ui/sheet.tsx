import type * as React from "react";

import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPanel,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/lib/components/ui/dialog";

const Sheet = Dialog;
const SheetClose = DialogClose;
const SheetDescription = DialogDescription;
const SheetFooter = DialogFooter;
const SheetHeader = DialogHeader;
const SheetPanel = DialogPanel;
const SheetTitle = DialogTitle;
const SheetTrigger = DialogTrigger;

function SheetPopup(props: React.ComponentProps<typeof DialogPopup>) {
    return <DialogPopup bottomStickOnMobile {...props} />;
}

export {
    Sheet,
    SheetClose,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetPanel,
    SheetPopup,
    SheetTitle,
    SheetTrigger,
};
