import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useWorktreeActivityQuery(
    projectId: string | undefined,
    branchName: string | undefined,
    baseBranchName: string | undefined,
    pullRequestNumber: number | undefined,
    enabled = true,
) {
    return useQuery({
        queryKey: prRunQueryKeys.activity(
            projectId ?? "unknown",
            branchName ?? "unknown",
            baseBranchName ?? "default",
            pullRequestNumber,
        ),
        queryFn: () =>
            prRunApi.getWorktreeActivity(
                projectId!,
                branchName!,
                baseBranchName,
                pullRequestNumber,
            ),
        enabled: Boolean(projectId && branchName && enabled),
    });
}
