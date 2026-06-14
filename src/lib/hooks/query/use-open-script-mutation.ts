import { useMutation } from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";

export function useOpenScriptMutation() {
    return useMutation({
        mutationFn: (scriptId: string) => prRunApi.openScript(scriptId),
    });
}
