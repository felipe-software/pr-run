import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useDockerOverviewQuery(
    projectId: string | undefined,
    branchName: string | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: prRunQueryKeys.docker(
            projectId ?? "unknown",
            branchName ?? "unknown",
        ),
        queryFn: () => prRunApi.getDockerOverview(projectId!, branchName!),
        enabled: Boolean(projectId) && Boolean(branchName) && enabled,
    });
}
