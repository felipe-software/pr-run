import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useOverviewQuery(projectId?: string) {
    return useQuery({
        queryKey: prRunQueryKeys.overview(projectId),
        queryFn: () => prRunApi.getOverview(projectId),
        staleTime: 30_000,
    });
}
