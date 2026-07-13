import { tryPromise } from "@/lib/error";

export type TerminalDisposalTarget = {
    sessionId: string;
    tabId: string;
};

type TerminalDisposalFailure = TerminalDisposalTarget & {
    error: Error;
};

export class TerminalDisposalError extends AggregateError {
    readonly failedSessionIds: string[];

    constructor(failures: TerminalDisposalFailure[], totalCount: number) {
        const failedSessionIds = failures.map((failure) => failure.sessionId);
        super(
            failures.map((failure) => failure.error),
            `Failed to dispose ${failures.length} of ${totalCount} terminal sessions: ${failedSessionIds.join(", ")}`,
        );
        this.name = "TerminalDisposalError";
        this.failedSessionIds = failedSessionIds;
    }
}

export async function disposeTerminalTabs(
    targets: TerminalDisposalTarget[],
    disposeSession: (sessionId: string) => Promise<unknown>,
    onDisposed: (tabId: string) => void,
) {
    const results = await Promise.all(
        targets.map(async (target) => {
            const [error] = await tryPromise(disposeSession(target.sessionId));

            if (error) {
                return { ...target, error };
            }

            onDisposed(target.tabId);
            return null;
        }),
    );
    const failures = results.filter(
        (result): result is TerminalDisposalFailure => result !== null,
    );

    if (failures.length > 0) {
        throw new TerminalDisposalError(failures, targets.length);
    }
}
