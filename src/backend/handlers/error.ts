export const tryPromise = async <T, E = Error>(
    promise: Promise<T>,
): Promise<[E, null] | [null, T]> => {
    try {
        const result = await promise;
        return [null, result];
    } catch (error: any) {
        console.warn({
            msg: "Try promise error",
            error: { message: error.message },
        });

        const typedError =
            error instanceof Error
                ? (error as E)
                : (new Error(String(error)) as E);
        return [typedError, null];
    }
};
