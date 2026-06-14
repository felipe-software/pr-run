import { useMutation, useQueryClient } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useCreateScriptMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (title: string) => prRunApi.createScript(title),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: prRunQueryKeys.scripts,
            });
        },
    });
}
