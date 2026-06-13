import { useMutation, useQueryClient } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

type CheckoutBranchVariables = {
    projectId: string;
    branchName: string;
};

export function useCheckoutBranchMutation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ branchName, projectId }: CheckoutBranchVariables) =>
            prRunApi.checkoutBranch(projectId, branchName),
        onSuccess: async (_result, variables) => {
            await queryClient.invalidateQueries({
                queryKey: prRunQueryKeys.project(variables.projectId),
            });
        },
    });
}
