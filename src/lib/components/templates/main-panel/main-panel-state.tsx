import type { ReactNode } from "react";

import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";

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
        <main
            className="bg-background flex h-dvh min-h-0 flex-1 items-center
                justify-center overflow-y-auto p-8"
        >
            <Surface
                className={[
                    "px-4 py-3 text-sm",
                    tone === "danger" ? "" : "text-muted-foreground",
                    icon ? "flex items-center gap-2" : "",
                ].join(" ")}
                variant={tone === "danger" ? "danger" : "muted"}
            >
                {icon ?? null}
                <span>{children}</span>
            </Surface>
        </main>
    );
}

export function MainPanelLoadingState({ children }: { children: ReactNode }) {
    return (
        <MainPanelState icon={<Skeleton className="size-4 rounded-sm" />}>
            {children}
        </MainPanelState>
    );
}
