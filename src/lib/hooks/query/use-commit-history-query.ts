import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useCommitHistoryQuery(
    projectId: string | undefined,
    branchName: string | undefined,
    baseBranchName: string | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: prRunQueryKeys.commits(
            projectId ?? "unknown",
            branchName ?? "unknown",
            baseBranchName ?? "default",
        ),
        queryFn: () =>
            prRunApi.getCommitHistory(projectId!, branchName!, baseBranchName),
        enabled: Boolean(projectId) && Boolean(branchName) && enabled,
    });
}
