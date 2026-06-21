import { RefreshCw } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { StatusPill } from "@/lib/components/atoms/status-pill";
import { Surface } from "@/lib/components/atoms/surface";
import { useEnvFilesQuery } from "@/lib/hooks/query/use-env-files-query";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type BranchEnvPanelProps = {
    branchName: string;
    projectId: string;
};

export function BranchEnvPanel({ branchName, projectId }: BranchEnvPanelProps) {
    const envFilesQuery = useEnvFilesQuery(projectId, branchName);
    const envFilesOverview = envFilesQuery.data;

    if (envFilesQuery.isPending) {
        return (
            <div className="grid gap-3">
                <Surface className="grid gap-2 px-3 py-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-7 w-full" />
                </Surface>
                <div className="grid gap-3">
                    <Surface className="grid gap-2 px-3 py-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-28 w-full" />
                    </Surface>
                    <Surface className="grid gap-2 px-3 py-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-20 w-full" />
                    </Surface>
                </div>
            </div>
        );
    }

    if (envFilesQuery.error) {
        return (
            <Surface className="px-3 py-3" variant="danger">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 text-sm">
                        {getErrorMessage(envFilesQuery.error)}
                    </div>
                    <Button
                        size="xs"
                        type="button"
                        variant="outline"
                        onPress={() => {
                            envFilesQuery.refetch();
                        }}
                    >
                        Retry
                    </Button>
                </div>
            </Surface>
        );
    }

    if (!envFilesOverview?.files.length) {
        return (
            <Surface className="min-h-56" variant="muted">
                <EmptyState
                    actions={
                        <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onPress={() => {
                                envFilesQuery.refetch();
                            }}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Refresh
                        </Button>
                    }
                    description="PR Run looks for .env and .env.* files at the root of the selected worktree."
                    title="No env files found"
                />
            </Surface>
        );
    }

    return (
        <section className="flex min-h-0 flex-1 flex-col gap-3">
            <Surface className="px-3 py-3">
                <div
                    className="flex flex-wrap items-start justify-between gap-3"
                >
                    <div className="min-w-0 space-y-1">
                        <div className="text-sm font-semibold">Env Files</div>
                        <div className="text-muted-foreground text-xs">
                            {envFilesOverview.files.length} files loaded from
                            the selected worktree
                        </div>
                    </div>
                    <Button
                        size="xs"
                        type="button"
                        variant="outline"
                        onPress={() => {
                            envFilesQuery.refetch();
                        }}
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Refresh
                    </Button>
                </div>
            </Surface>

            <div className="grid gap-3">
                {envFilesOverview.files.map((file) => (
                    <Surface
                        className="flex flex-col gap-3 px-3 py-3"
                        key={file.name}
                    >
                        <div
                            className="flex flex-wrap items-start
                                justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <div
                                    className="text-foreground font-mono
                                        text-[12px] font-semibold"
                                >
                                    {file.name}
                                </div>
                                <div
                                    className="text-muted-foreground mt-1
                                        text-xs"
                                >
                                    {file.linkedPath
                                        ? `Linked to ${file.linkedPath}`
                                        : "Stored directly in the worktree"}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {file.isSymbolicLink ? (
                                    <StatusPill tone="worktree">
                                        Symlink
                                    </StatusPill>
                                ) : (
                                    <StatusPill tone="idle">Local</StatusPill>
                                )}
                                {file.readError ? (
                                    <StatusPill tone="error">
                                        Read Error
                                    </StatusPill>
                                ) : null}
                            </div>
                        </div>

                        {file.readError ? (
                            <Surface
                                className="px-3 py-2 text-sm"
                                variant="danger"
                            >
                                {file.readError}
                            </Surface>
                        ) : (
                            <Surface
                                className="text-foreground max-h-[360px]
                                    overflow-auto px-3 py-3 font-mono
                                    text-[11px] leading-5 whitespace-pre-wrap"
                                variant="muted"
                            >
                                {file.content?.trim().length
                                    ? file.content
                                    : "# Empty file"}
                            </Surface>
                        )}
                    </Surface>
                ))}
            </div>
        </section>
    );
}
