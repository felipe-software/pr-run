import { tryPromise } from "@/backend/handlers/error";
import { ghText } from "@/backend/handlers/git/github";
import { ApiError } from "@/backend/types";

const GITHUB_MEDIA_HOST = "github.com";
const GITHUB_MEDIA_PATH = /^\/user-attachments\/assets\/[a-f\d-]{36}$/i;

export async function getGitHubMedia(sourceUrl: string) {
    const url = await parseGitHubMediaUrl(sourceUrl);
    const [, token] = await tryPromise(ghText(["auth", "token"]));

    const [requestError, response] = await tryPromise(
        fetch(url, {
            headers: {
                Accept: "application/octet-stream",
                ...(token?.trim()
                    ? { Authorization: `Bearer ${token.trim()}` }
                    : {}),
                "User-Agent": "pr-run",
            },
            redirect: "follow",
        }),
    );

    if (requestError || !response) {
        throw new ApiError(
            "GITHUB_INTEGRATION_FAILED",
            "GitHub image could not be loaded.",
            502,
        );
    }

    if (!response.ok) {
        throw new ApiError(
            "GITHUB_INTEGRATION_FAILED",
            response.status === 404
                ? "GitHub image was not found or is not accessible."
                : "GitHub image could not be loaded.",
            response.status === 404 ? 404 : 502,
        );
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("image/")) {
        throw new ApiError(
            "GITHUB_INTEGRATION_FAILED",
            "GitHub media is not an image.",
            415,
        );
    }

    const headers = new Headers({
        "Cache-Control": "private, max-age=300",
        "Content-Type": contentType,
    });
    const contentLength = response.headers.get("content-length");

    if (contentLength) {
        headers.set("Content-Length", contentLength);
    }

    return new Response(response.body, { headers });
}

export async function parseGitHubMediaUrl(sourceUrl: string) {
    const [urlError, url] = await tryPromise(createUrl(sourceUrl));

    if (
        urlError ||
        !url ||
        url.protocol !== "https:" ||
        url.hostname !== GITHUB_MEDIA_HOST ||
        !GITHUB_MEDIA_PATH.test(url.pathname) ||
        url.username ||
        url.password
    ) {
        throw new ApiError(
            "BAD_REQUEST",
            "Enter a valid GitHub attachment URL.",
            400,
        );
    }

    return url.toString();
}

async function createUrl(sourceUrl: string) {
    return new URL(sourceUrl);
}
