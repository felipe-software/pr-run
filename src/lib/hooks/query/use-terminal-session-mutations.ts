import {
    queryOptions,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";

import { prRunApi } from "@/lib/api";
import { prRunQueryKeys } from "@/lib/hooks/query/query-keys";
import type {
    TerminalCreateOptions,
    TerminalInputOptions,
} from "@/types/pr-run";

export function terminalSessionStateQueryOptions(sessionId: string) {
    return queryOptions({
        queryKey: prRunQueryKeys.terminalState(sessionId),
        queryFn: () => prRunApi.getTerminalSessionState(sessionId),
        staleTime: 0,
    });
}

export function terminalSessionSnapshotQueryOptions(sessionId: string) {
    return queryOptions({
        queryKey: prRunQueryKeys.terminal(sessionId),
        queryFn: () => prRunApi.getTerminalSessionSnapshot(sessionId),
        staleTime: 0,
    });
}

export function useTerminalSessionMutations() {
    const queryClient = useQueryClient();
    const createMutation = useMutation({
        mutationFn: (options: TerminalCreateOptions) =>
            prRunApi.createTerminalSession(options),
        onSuccess: (session) => {
            queryClient.setQueryData(
                prRunQueryKeys.terminal(session.id),
                session,
            );
        },
    });
    const disposeMutation = useMutation({
        mutationFn: (sessionId: string) =>
            prRunApi.disposeTerminalSession(sessionId),
        onSettled: (_result, _error, sessionId) => {
            queryClient.removeQueries({
                queryKey: prRunQueryKeys.terminal(sessionId),
            });
        },
    });
    const writeMutation = useMutation({
        mutationFn: (input: {
            data: string;
            options?: TerminalInputOptions;
            sessionId: string;
        }) =>
            prRunApi.writeTerminalInput(
                input.sessionId,
                input.data,
                input.options,
            ),
    });
    const resizeMutation = useMutation({
        mutationFn: (input: {
            cols: number;
            rows: number;
            sessionId: string;
        }) => prRunApi.resizeTerminal(input.sessionId, input.cols, input.rows),
    });

    return {
        createMutation,
        disposeMutation,
        getSessionState(sessionId: string) {
            return queryClient.fetchQuery(
                terminalSessionStateQueryOptions(sessionId),
            );
        },
        resizeMutation,
        writeMutation,
    };
}
