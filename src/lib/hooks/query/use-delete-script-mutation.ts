import { useMutation, useQueryClient } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useDeleteScriptMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (scriptId: string) => prRunApi.deleteScript(scriptId),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: prRunQueryKeys.scripts,
            });
        },
    });
}
