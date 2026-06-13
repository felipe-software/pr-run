import type { ApiEnvelope, ApiMetadata } from "@/backend/types";

export function success<T>(
    message: string,
    data: T[] = [],
    metadata: ApiMetadata = {},
): ApiEnvelope<T> {
    return {
        type: "success" as const,
        message,
        data,
        _metadata: metadata,
    };
}

export function failure(
    message: string,
    metadata: ApiMetadata = {},
    data: unknown[] = [],
): ApiEnvelope<unknown> {
    return {
        type: "error" as const,
        message,
        data,
        _metadata: metadata,
    };
}
