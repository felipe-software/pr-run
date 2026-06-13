import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useProjectBranchesQuery(
    projectId: string | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: prRunQueryKeys.branches(projectId ?? "unknown"),
        queryFn: () => prRunApi.listBranches(projectId!),
        enabled: Boolean(projectId) && enabled,
    });
}
