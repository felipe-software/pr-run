import { queryOptions, useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function projectBranchesQueryOptions(projectId: string) {
    return queryOptions({
        queryKey: prRunQueryKeys.branches(projectId),
        queryFn: () => prRunApi.listBranches(projectId),
    });
}

export function useProjectBranchesQuery(
    projectId: string | undefined,
    enabled = true,
) {
    return useQuery({
        ...projectBranchesQueryOptions(projectId ?? "unknown"),
        enabled: Boolean(projectId) && enabled,
    });
}
