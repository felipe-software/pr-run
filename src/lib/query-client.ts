import { QueryClient } from "@tanstack/react-query";

import { QUERY_CACHE_MAX_AGE } from "@/lib/query-cache-persistence";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: QUERY_CACHE_MAX_AGE,
            retry: false,
            staleTime: 30_000,
        },
    },
});
