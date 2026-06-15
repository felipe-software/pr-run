import { Spinner, Surface } from "@heroui/react";
import type { ReactNode } from "react";

type MainPanelStateTone = "neutral" | "danger";

type MainPanelStateProps = {
    children: ReactNode;
    icon?: ReactNode;
    tone?: MainPanelStateTone;
};

export function MainPanelState({
    children,
    icon,
    tone = "neutral",
}: MainPanelStateProps) {
    return (
        <main className="flex h-screen min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background p-8">
            <Surface
                className={[
                    "text-sm",
                    tone === "danger"
                        ? "rounded-md border border-danger/25 bg-danger/10 px-4 py-3 text-danger"
                        : "text-muted-foreground",
                    icon ? "flex items-center gap-2" : "",
                ].join(" ")}
            >
                {icon ?? null}
                <span>{children}</span>
            </Surface>
        </main>
    );
}

export function MainPanelLoadingState({ children }: { children: ReactNode }) {
    return (
        <MainPanelState icon={<Spinner size="sm" />}>{children}</MainPanelState>
    );
}
