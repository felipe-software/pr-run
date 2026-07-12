import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useCommitDiffQuery(
    projectId: string,
    hash: string,
    enabled: boolean,
) {
    return useQuery({
        queryKey: prRunQueryKeys.commitDiff(projectId, hash),
        queryFn: () => prRunApi.getCommitDiff(projectId, hash),
        enabled,
        staleTime: Number.POSITIVE_INFINITY,
    });
}
