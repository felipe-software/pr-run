import { useIsFetching } from "@tanstack/react-query";

import { isRefreshingCachedQuery } from "@/lib/query-cache-persistence";

export function useIsRefreshingCachedData() {
    return (
        useIsFetching({
            predicate: isRefreshingCachedQuery,
        }) > 0
    );
}
