import { useMutation, useQueryClient } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useUpdateProjectWorktreesMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (projectId: string) =>
            prRunApi.updateProjectWorktrees(projectId),
        onSuccess: async (_result, projectId) => {
            await queryClient.invalidateQueries({
                queryKey: prRunQueryKeys.project(projectId),
            });
        },
    });
}
