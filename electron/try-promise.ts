export async function tryPromise<T, E = Error>(
    promise: Promise<T>,
): Promise<[E, null] | [null, T]> {
    try {
        return [null, await promise];
    } catch (error) {
        const typedError =
            error instanceof Error
                ? (error as E)
                : (new Error(String(error)) as E);

        return [typedError, null];
    }
}
