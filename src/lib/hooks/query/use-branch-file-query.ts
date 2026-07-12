import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useBranchFileQuery(
    projectId: string,
    branchName: string,
    path: string | undefined,
    enabled: boolean,
) {
    return useQuery({
        queryKey: prRunQueryKeys.file(projectId, branchName, path ?? "unknown"),
        queryFn: () => prRunApi.getBranchFile(projectId, branchName, path!),
        enabled: enabled && Boolean(path),
        staleTime: Number.POSITIVE_INFINITY,
    });
}
