import * as Cause from "effect/Cause";
import type * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import type * as ManagedRuntime from "effect/ManagedRuntime";
import * as Option from "effect/Option";

type RunOptions = {
    signal?: AbortSignal;
};

export async function runManagedEffect<A, E, R>(
    runtime: ManagedRuntime.ManagedRuntime<R, never>,
    effect: Effect.Effect<A, E, R>,
    options?: RunOptions,
): Promise<A> {
    const exit = await runtime.runPromiseExit(effect, options);

    if (Exit.isSuccess(exit)) {
        return exit.value;
    }

    const failure = Cause.failureOption(exit.cause);

    if (Option.isSome(failure)) {
        throw failure.value;
    }

    throw Cause.squash(exit.cause);
}
