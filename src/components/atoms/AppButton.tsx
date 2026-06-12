import { Button } from "@heroui/react";
import type { ComponentProps } from "react";

type AppButtonProps = ComponentProps<typeof Button> & {
    tone?: "primary" | "ghost";
};

export function AppButton({
    className,
    isIconOnly,
    tone = "ghost",
    ...props
}: AppButtonProps) {
    const baseClass = isIconOnly ? "app-icon-button" : "app-button";
    const toneClass =
        tone === "primary" ? "app-button-primary" : "app-button-ghost";

    return (
        <Button
            className={[baseClass, toneClass, className]
                .filter(Boolean)
                .join(" ")}
            isIconOnly={isIconOnly}
            variant="ghost"
            {...props}
        />
    );
}
