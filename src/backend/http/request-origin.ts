import { normalizeLoopbackHttpUrl } from "@/contracts/local-authority";

export function isAllowedRequestOrigin(origin: string | null) {
    if (origin === null || origin === "null") {
        return true;
    }

    return normalizeLoopbackHttpUrl(origin) !== null;
}
