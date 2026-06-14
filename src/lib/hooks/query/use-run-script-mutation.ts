import { useMutation } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
type RunScriptVariables = {
    projectId: string;
    branchName: string;
    scriptId: string;
};

export function useRunScriptMutation() {
    return useMutation({
        mutationFn: (variables: RunScriptVariables) =>
            prRunApi.prepareScriptTerminalCommand(
                variables.projectId,
                variables.branchName,
                variables.scriptId,
            ),
    });
}
