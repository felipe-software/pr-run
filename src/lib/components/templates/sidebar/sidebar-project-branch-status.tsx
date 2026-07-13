import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";

type SidebarProjectBranchStatusProps = {
    branchCount: number;
    error?: string;
    isAwaitingSshPassphrase: boolean;
    isExpanded: boolean;
    isPending: boolean;
};

export function SidebarProjectBranchStatus({
    branchCount,
    error,
    isAwaitingSshPassphrase,
    isExpanded,
    isPending,
}: SidebarProjectBranchStatusProps) {
    if (!isExpanded) {
        return null;
    }

    if (isPending) {
        return (
            <div className="flex flex-col gap-1 px-1.5 py-1">
                <Skeleton className="h-5 w-11/12" />
                <Skeleton className="h-5 w-9/12" />
                <Skeleton className="h-5 w-10/12" />
            </div>
        );
    }

    if (isAwaitingSshPassphrase) {
        return (
            <Surface
                className="text-muted-foreground/70 border-0 bg-transparent px-2
                    py-1.5 text-[11px] leading-5"
                variant="plain"
            >
                Waiting for SSH passphrase...
            </Surface>
        );
    }

    if (error) {
        return (
            <Surface
                className="px-2 py-1.5 text-[11px] leading-5"
                variant="danger"
            >
                {error}
            </Surface>
        );
    }

    if (branchCount === 0) {
        return (
            <div
                className="text-muted-foreground/70 px-2 py-1.5 text-[11px]
                    leading-5"
            >
                No remote branches.
            </div>
        );
    }

    return null;
}
