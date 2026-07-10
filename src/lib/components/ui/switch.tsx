import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils/cn";

export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
    return (
        <SwitchPrimitive.Root
            className={cn(
                `bg-muted data-checked:bg-primary focus-visible:ring-ring/40
                relative inline-flex h-5 w-9 cursor-pointer rounded-full
                transition-colors outline-none focus-visible:ring-2
                disabled:cursor-not-allowed disabled:opacity-60`,
                className as string | undefined,
            )}
            data-slot="switch"
            {...props}
        >
            <SwitchPrimitive.Thumb
                className="block size-4 translate-x-0.5 rounded-full bg-white
                    shadow-sm transition-transform
                    data-checked:translate-x-[1.125rem]"
            />
        </SwitchPrimitive.Root>
    );
}
