import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useEnvFilesQuery(
    projectId: string | undefined,
    branchName: string | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: prRunQueryKeys.env(
            projectId ?? "unknown",
            branchName ?? "unknown",
        ),
        queryFn: () => prRunApi.getEnvFiles(projectId!, branchName!),
        enabled: Boolean(projectId) && Boolean(branchName) && enabled,
    });
}
