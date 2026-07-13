export function isAllowedExternalUrl(value: string) {
    let url: URL;

    try {
        url = new URL(value);
    } catch {
        return false;
    }

    return url.protocol === "https:" || url.protocol === "http:";
}
