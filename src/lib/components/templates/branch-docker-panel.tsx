import { toast } from "@heroui/react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";
import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { StatusPill } from "@/lib/components/atoms/status-pill";
import { Surface } from "@/lib/components/atoms/surface";
import { tryPromise } from "@/lib/error";
import { useDockerOverviewQuery } from "@/lib/hooks/query/use-docker-overview-query";
import { usePrepareDockerCommandMutation } from "@/lib/hooks/query/use-prepare-docker-command-mutation";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type {
    DockerServiceState,
    DockerTerminalCommandAction,
} from "@/types/pr-run";

type BranchDockerPanelProps = {
    branchName: string;
    projectId: string;
    onRunDockerCommand: (payload: {
        command: string;
        scriptTitle: string;
    }) => Promise<void>;
};

const COMPOSE_FILE_NAMES_LABEL =
    "compose.yaml, compose.yml, docker-compose.yml, docker-compose.yaml";

export function BranchDockerPanel({
    branchName,
    projectId,
    onRunDockerCommand,
}: BranchDockerPanelProps) {
    const dockerOverviewQuery = useDockerOverviewQuery(projectId, branchName);
    const prepareDockerCommandMutation = usePrepareDockerCommandMutation();
    const dockerOverview = dockerOverviewQuery.data;
    const runningCount =
        dockerOverview?.services.filter((service) => service.isRunning)
            .length ?? 0;
    const serviceCount = dockerOverview?.services.length ?? 0;

    async function queueDockerCommand(
        action: DockerTerminalCommandAction,
        service?: string,
    ) {
        const [prepareError, preparedCommand] = await tryPromise(
            prepareDockerCommandMutation.mutateAsync({
                action,
                branchName,
                projectId,
                service,
            }),
        );

        if (prepareError) {
            toast.danger(getErrorMessage(prepareError), { timeout: 3200 });
            return;
        }

        const label = dockerActionLabel(action, service);
        const [runError] = await tryPromise(
            onRunDockerCommand({
                command: preparedCommand.command,
                scriptTitle: label,
            }),
        );

        if (runError) {
            toast.danger(getErrorMessage(runError), { timeout: 3200 });
            return;
        }

        toast.success(`${label} sent to the worktree terminal.`, {
            timeout: 2200,
        });
        dockerOverviewQuery.refetch();
    }

    if (dockerOverviewQuery.isPending) {
        return (
            <div className="grid gap-3">
                <Surface className="grid gap-2 px-3 py-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-7 w-9/12" />
                </Surface>
                <div className="grid gap-2 md:grid-cols-2">
                    <Surface className="grid gap-2 px-3 py-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-11/12" />
                        <Skeleton className="h-7 w-24" />
                    </Surface>
                    <Surface className="grid gap-2 px-3 py-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-7 w-28" />
                    </Surface>
                </div>
            </div>
        );
    }

    if (dockerOverviewQuery.error) {
        return (
            <Surface className="px-3 py-3" variant="danger">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 text-sm">
                        {getErrorMessage(dockerOverviewQuery.error)}
                    </div>
                    <Button
                        size="xs"
                        type="button"
                        variant="outline"
                        onPress={() => {
                            dockerOverviewQuery.refetch();
                        }}
                    >
                        Retry
                    </Button>
                </div>
            </Surface>
        );
    }

    if (!dockerOverview?.composeFilePath) {
        return (
            <Surface className="min-h-56" variant="muted">
                <EmptyState
                    actions={
                        <Button
                            size="sm"
                            type="button"
                            variant="outline"
                            onPress={() => {
                                dockerOverviewQuery.refetch();
                            }}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Refresh
                        </Button>
                    }
                    description={`PR Run looked for ${COMPOSE_FILE_NAMES_LABEL} in this worktree and supported subfolders.`}
                    title="No Docker Compose file found"
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
                        <div className="text-sm font-semibold">Docker</div>
                        <div
                            className="text-muted-foreground font-mono
                                text-[11px]"
                        >
                            {dockerOverview.composeFilePath}
                        </div>
                        <div className="text-muted-foreground text-xs">
                            {runningCount}/{serviceCount} services running
                            {dockerOverview.composeCli
                                ? ` via ${dockerOverview.composeCli}`
                                : ""}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            isDisabled={prepareDockerCommandMutation.isPending}
                            size="xs"
                            type="button"
                            variant="outline"
                            onPress={() => {
                                dockerOverviewQuery.refetch();
                            }}
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Refresh
                        </Button>
                        <Button
                            isDisabled={prepareDockerCommandMutation.isPending}
                            size="xs"
                            type="button"
                            variant="outline"
                            onPress={() => {
                                queueDockerCommand("up");
                            }}
                        >
                            Up
                        </Button>
                        <Button
                            isDisabled={prepareDockerCommandMutation.isPending}
                            size="xs"
                            type="button"
                            variant="outline"
                            onPress={() => {
                                queueDockerCommand("restart");
                            }}
                        >
                            Restart
                        </Button>
                        <Button
                            isDisabled={prepareDockerCommandMutation.isPending}
                            size="xs"
                            type="button"
                            variant="outline"
                            onPress={() => {
                                queueDockerCommand("logs");
                            }}
                        >
                            Logs
                        </Button>
                        <Button
                            isDisabled={prepareDockerCommandMutation.isPending}
                            size="xs"
                            type="button"
                            variant="danger"
                            onPress={() => {
                                queueDockerCommand("down");
                            }}
                        >
                            Down
                        </Button>
                    </div>
                </div>
            </Surface>

            {dockerOverview.services.length === 0 ? (
                <Surface className="min-h-40" variant="muted">
                    <EmptyState
                        description="The detected Compose file does not expose services that PR Run could inspect."
                        title="No services available"
                    />
                </Surface>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {dockerOverview.services.map((service) => {
                        const isPending =
                            prepareDockerCommandMutation.isPending &&
                            prepareDockerCommandMutation.variables?.action ===
                                "logs" &&
                            prepareDockerCommandMutation.variables?.service ===
                                service.name;

                        return (
                            <Surface
                                className="flex min-h-36 flex-col gap-3 px-3
                                    py-3"
                                key={service.name}
                            >
                                <div
                                    className="flex items-start justify-between
                                        gap-3"
                                >
                                    <div className="min-w-0">
                                        <div
                                            className="truncate text-sm
                                                font-semibold"
                                        >
                                            {service.name}
                                        </div>
                                        <div
                                            className="text-muted-foreground
                                                mt-1 truncate font-mono
                                                text-[11px]"
                                        >
                                            {service.containerName ??
                                                "Container not created yet"}
                                        </div>
                                    </div>
                                    <StatusPill
                                        tone={dockerStateTone(service.state)}
                                    >
                                        {dockerStateLabel(service.state)}
                                    </StatusPill>
                                </div>

                                <div
                                    className="text-muted-foreground grid gap-1
                                        text-xs"
                                >
                                    <div>
                                        {service.statusText ??
                                            "No runtime status available yet."}
                                    </div>
                                    <div>Health: {service.health ?? "n/a"}</div>
                                </div>

                                <div
                                    className="mt-auto flex items-center
                                        justify-end"
                                >
                                    <Button
                                        isDisabled={isPending}
                                        size="xs"
                                        type="button"
                                        variant="outline"
                                        onPress={() => {
                                            queueDockerCommand(
                                                "logs",
                                                service.name,
                                            );
                                        }}
                                    >
                                        {isPending ? "Preparing..." : "Logs"}
                                    </Button>
                                </div>
                            </Surface>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function dockerActionLabel(
    action: DockerTerminalCommandAction,
    service?: string,
) {
    switch (action) {
        case "down":
            return "Docker Down";
        case "logs":
            return service ? `Docker Logs ${service}` : "Docker Logs";
        case "restart":
            return "Docker Restart";
        case "up":
            return "Docker Up";
    }
}

function dockerStateLabel(state: DockerServiceState) {
    return state === "not-created" ? "Not Created" : capitalize(state);
}

function dockerStateTone(state: DockerServiceState) {
    switch (state) {
        case "running":
            return "worktree" as const;
        case "created":
        case "restarting":
            return "busy" as const;
        case "dead":
        case "exited":
        case "unknown":
            return "error" as const;
        default:
            return "idle" as const;
    }
}

function capitalize(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
