import { useMutation, useQueryClient } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

type RemoveWorktreeVariables = {
    projectId: string;
    branchName: string;
};

export function useRemoveWorktreeMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ branchName, projectId }: RemoveWorktreeVariables) =>
            prRunApi.removeWorktree(projectId, branchName),
        onSuccess: async (_result, variables) => {
            await queryClient.invalidateQueries({
                queryKey: prRunQueryKeys.project(variables.projectId),
            });
        },
    });
}
