import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useConfigQuery(enabled = true) {
    return useQuery({
        queryKey: prRunQueryKeys.config,
        queryFn: () => prRunApi.getConfig(),
        enabled,
    });
}
