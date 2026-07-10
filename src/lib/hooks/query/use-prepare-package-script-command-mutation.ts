import { useMutation } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";

export function usePreparePackageScriptCommandMutation() {
    return useMutation({
        mutationFn: (input: {
            branchName: string;
            packagePath: string;
            projectId: string;
            scriptName: string;
        }) =>
            prRunApi.preparePackageScriptTerminalCommand(
                input.projectId,
                input.branchName,
                input.packagePath,
                input.scriptName,
            ),
    });
}
