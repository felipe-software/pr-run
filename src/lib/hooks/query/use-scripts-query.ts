import { useQuery } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";

export function useScriptsQuery(enabled = true) {
    return useQuery({
        queryKey: prRunQueryKeys.scripts,
        queryFn: () => prRunApi.listScripts(),
        enabled,
    });
}
