import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function usePackageScriptsQuery(
    projectId: string | undefined,
    branchName: string | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: prRunQueryKeys.packageScripts(
            projectId ?? "unknown",
            branchName ?? "unknown",
        ),
        queryFn: () => prRunApi.getPackageScripts(projectId!, branchName!),
        enabled: Boolean(projectId && branchName && enabled),
    });
}
