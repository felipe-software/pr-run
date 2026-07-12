import { AlertTriangle } from "lucide-react";

import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";

type AppInitialStateProps =
    | { error: string; isLoading?: never }
    | { error?: never; isLoading: true };

export function AppInitialState({ error }: AppInitialStateProps) {
    if (error) {
        return (
            <div
                className="bg-background text-foreground fixed inset-0 flex
                    items-center justify-center overflow-hidden p-8 font-sans"
            >
                <Surface
                    className="max-w-lg px-4 py-3 text-sm"
                    variant="danger"
                >
                    <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                </Surface>
            </div>
        );
    }

    return (
        <Surface
            className="bg-background fixed inset-0 flex items-center
                justify-center overflow-hidden rounded-none border-0 font-sans"
            variant="plain"
        >
            <EmptyState
                description="Loading projects, branches, and saved scripts."
                icon={<Skeleton className="size-4 rounded-sm" />}
                title="Opening PR Run"
            />
        </Surface>
    );
}
