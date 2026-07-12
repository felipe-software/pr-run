import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";
import type { OverviewSnapshot } from "@/types/overview";

export function useOverviewQuery(projectId?: string) {
    return useQuery({
        queryKey: prRunQueryKeys.overview(projectId),
        queryFn: () => prRunApi.getOverview(projectId),
        select: normalizeOverviewSnapshot,
        staleTime: 30_000,
    });
}

export function normalizeOverviewSnapshot(snapshot: OverviewSnapshot) {
    return {
        ...snapshot,
        recentPullRequests: Array.isArray(snapshot.recentPullRequests)
            ? snapshot.recentPullRequests
            : [],
    };
}
