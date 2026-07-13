const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

export function normalizeLoopbackHttpUrl(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    let url: URL;

    try {
        url = new URL(value);
    } catch {
        return null;
    }

    const hasAuthorityOnly =
        url.pathname === "/" && url.search === "" && url.hash === "";
    const hasCredentials = url.username !== "" || url.password !== "";

    if (
        url.protocol !== "http:" ||
        !LOOPBACK_HOSTNAMES.has(url.hostname) ||
        !hasAuthorityOnly ||
        hasCredentials
    ) {
        return null;
    }

    return url.origin;
}
