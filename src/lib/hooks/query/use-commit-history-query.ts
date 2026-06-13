import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useCommitHistoryQuery(
    projectId: string | undefined,
    branchName: string | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: prRunQueryKeys.commits(
            projectId ?? "unknown",
            branchName ?? "unknown",
        ),
        queryFn: () => prRunApi.getCommitHistory(projectId!, branchName!),
        enabled: Boolean(projectId) && Boolean(branchName) && enabled,
    });
}
