import { useMutation } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import type { DockerTerminalCommandAction } from "@/types/pr-run";

type PrepareDockerCommandVariables = {
    action: DockerTerminalCommandAction;
    branchName: string;
    projectId: string;
    service?: string;
};

export function usePrepareDockerCommandMutation() {
    return useMutation({
        mutationFn: (variables: PrepareDockerCommandVariables) =>
            prRunApi.prepareDockerTerminalCommand(
                variables.projectId,
                variables.branchName,
                variables.action,
                variables.service,
            ),
    });
}
