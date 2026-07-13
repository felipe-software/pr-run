import * as Effect from "effect/Effect";
import * as ManagedRuntime from "effect/ManagedRuntime";

import { ProjectRepository } from "@/backend/handlers/project-config/repository";
import { runManagedEffect } from "@/runtime/run-effect";

const backendRuntime = ManagedRuntime.make(ProjectRepository.layer);

export function runBackendEffect<A, E>(
    effect: Effect.Effect<A, E, ProjectRepository>,
) {
    return runManagedEffect(backendRuntime, effect);
}

function runBackendTask<A>(name: string, task: () => Promise<A>) {
    return runBackendEffect(
        Effect.tryPromise({
            catch: (error) => error,
            try: task,
        }).pipe(Effect.withSpan(name)),
    );
}

export function effectTask<Args extends unknown[], A>(
    name: string,
    task: (...args: Args) => Promise<A>,
) {
    return (...args: Args) => runBackendTask(name, () => task(...args));
}

export function disposeBackendRuntime() {
    return backendRuntime.dispose();
}
