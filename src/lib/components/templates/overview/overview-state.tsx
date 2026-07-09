import { AlertTriangle, ChartNoAxesCombined } from "lucide-react";

import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";

export function OverviewLoadingState() {
    return (
        <div className="grid gap-4">
            <div
                className="grid gap-px overflow-hidden rounded-lg border
                    sm:grid-cols-2 xl:grid-cols-4"
            >
                {[0, 1, 2, 3].map((item) => (
                    <div className="bg-surface px-4 py-3" key={item}>
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="mt-3 h-7 w-16" />
                    </div>
                ))}
            </div>
            <Skeleton className="h-72 w-full" />
        </div>
    );
}

export function OverviewErrorState({ message }: { message: string }) {
    return (
        <Surface className="min-h-72" variant="danger">
            <EmptyState
                description={message}
                icon={<AlertTriangle className="size-4" />}
                title="Overview could not load"
            />
        </Surface>
    );
}

export function OverviewEmptyState() {
    return (
        <Surface className="min-h-72" variant="muted">
            <EmptyState
                description="Add a project or open pull requests to populate the workspace overview."
                icon={<ChartNoAxesCombined className="size-4" />}
                title="No project activity yet"
            />
        </Surface>
    );
}
