import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useBranchDiffQuery(
    projectId: string | undefined,
    branchName: string | undefined,
    baseBranchName: string | undefined,
    pullRequestNumber?: number,
    enabled = true,
) {
    return useQuery({
        queryKey: prRunQueryKeys.diff(
            projectId ?? "unknown",
            branchName ?? "unknown",
            baseBranchName ?? "default",
            pullRequestNumber,
        ),
        queryFn: () =>
            prRunApi.getBranchDiff(
                projectId!,
                branchName!,
                baseBranchName,
                pullRequestNumber,
            ),
        enabled: Boolean(projectId) && Boolean(branchName) && enabled,
    });
}
