import { useMutation, useQueryClient } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useAddProjectMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (projectPath: string) => prRunApi.addProject(projectPath),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: prRunQueryKeys.config,
            });
        },
    });
}
