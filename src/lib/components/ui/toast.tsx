import { Toast } from "@base-ui/react/toast";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type PrRunToastData = {
    timeout?: number;
};

export type ToastOptions = PrRunToastData;

export const toastManager = Toast.createToastManager<PrRunToastData>();

const iconByType = {
    error: CircleAlert,
    info: Info,
    success: CircleCheck,
    warning: TriangleAlert,
} as const;

function addToast(
    type: keyof typeof iconByType,
    description: string,
    options?: ToastOptions,
) {
    toastManager.add({
        data: options,
        description,
        timeout: options?.timeout ?? 3200,
        type,
    });
}

export const toast = {
    success: (description: string, options?: ToastOptions) =>
        addToast("success", description, options),
    error: (description: string, options?: ToastOptions) =>
        addToast("error", description, options),
    warning: (description: string, options?: ToastOptions) =>
        addToast("warning", description, options),
    info: (description: string, options?: ToastOptions) =>
        addToast("info", description, options),
};

export function ToastViewport() {
    return (
        <Toast.Provider toastManager={toastManager}>
            <Toast.Portal>
                <Toast.Viewport
                    className="pointer-events-none fixed
                        top-[calc(var(--workspace-topbar-height)+1rem)] right-4
                        z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col
                        gap-2"
                    data-slot="toast-viewport"
                >
                    <ToastList />
                </Toast.Viewport>
            </Toast.Portal>
        </Toast.Provider>
    );
}

function ToastList() {
    const { toasts } = Toast.useToastManager<PrRunToastData>();

    return toasts.map((item) => {
        const Icon = iconByType[item.type as keyof typeof iconByType] ?? Info;

        return (
            <Toast.Root
                className="bg-popover text-popover-foreground
                    pointer-events-auto relative overflow-hidden rounded-lg
                    border shadow-lg/10 transition-[opacity,transform]
                    duration-200 data-ending-style:translate-x-3
                    data-ending-style:opacity-0
                    data-starting-style:translate-x-3
                    data-starting-style:opacity-0"
                data-slot="toast"
                key={item.id}
                toast={item}
            >
                <Toast.Content
                    className="flex items-start gap-2 px-3 py-2.5 text-sm"
                >
                    <Icon
                        className={cn(
                            "mt-0.5 size-4 shrink-0",
                            item.type === "error" && "text-destructive",
                            item.type === "success" && "text-success",
                            item.type === "warning" && "text-warning",
                            item.type === "info" && "text-info",
                        )}
                    />
                    <Toast.Description
                        className="text-muted-foreground min-w-0 flex-1"
                    />
                    <Toast.Close
                        aria-label="Dismiss notification"
                        className="text-muted-foreground hover:bg-accent
                            hover:text-foreground -mt-1 -mr-1 inline-flex size-6
                            shrink-0 cursor-pointer items-center justify-center
                            rounded-md"
                    >
                        <X className="size-3.5" />
                    </Toast.Close>
                </Toast.Content>
            </Toast.Root>
        );
    });
}
