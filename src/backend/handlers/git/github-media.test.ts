import { afterEach, describe, expect, test, vi } from "vitest";

import {
    getGitHubMedia,
    parseGitHubMediaUrl,
} from "@/backend/handlers/git/github-media";

const sourceUrl =
    "https://github.com/user-attachments/assets/b747a432-9bac-4c9e-8430-8477b285abd8";
const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");

function setFetch(fetch: unknown) {
    Object.defineProperty(globalThis, "fetch", {
        configurable: true,
        value: fetch,
    });
}

afterEach(() => {
    if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", originalFetch);
    }
    vi.restoreAllMocks();
});

describe("GitHub media", () => {
    test("accepts GitHub user attachment images", async () => {
        await expect(parseGitHubMediaUrl(sourceUrl)).resolves.toBe(sourceUrl);
    });

    test("rejects other hosts and GitHub paths", async () => {
        await expect(
            parseGitHubMediaUrl(
                "https://example.com/user-attachments/assets/b747a432-9bac-4c9e-8430-8477b285abd8",
            ),
        ).rejects.toThrow("valid GitHub attachment URL");
        await expect(
            parseGitHubMediaUrl("https://github.com/settings/tokens"),
        ).rejects.toThrow("valid GitHub attachment URL");
    });

    test.each([
        "not a URL",
        sourceUrl.replace("https:", "http:"),
        sourceUrl.replace("github.com", "user:secret@github.com"),
        `${sourceUrl}/extra`,
    ])("rejects malformed or unsafe attachment URL %s", async (value) => {
        await expect(parseGitHubMediaUrl(value)).rejects.toMatchObject({
            code: "BAD_REQUEST",
            status: 400,
        });
    });

    test("forwards image responses with safe caching headers", async () => {
        const fetch = vi.fn(
            async (_input: string | URL | Request, _init?: RequestInit) =>
                new Response("image bytes", {
                    headers: {
                        "content-length": "11",
                        "content-type": "image/png",
                    },
                }),
        );
        setFetch(fetch);

        const response = await getGitHubMedia(sourceUrl);

        expect(await response.text()).toBe("image bytes");
        expect(response.headers.get("content-type")).toBe("image/png");
        expect(response.headers.get("content-length")).toBe("11");
        expect(response.headers.get("cache-control")).toBe(
            "private, max-age=300",
        );
        expect(fetch.mock.calls[0]?.[1]).toMatchObject({
            headers: {
                Accept: "application/octet-stream",
                "User-Agent": "pr-run",
            },
            redirect: "follow",
        });
    });

    test.each([
        [404, "not found", 404],
        [500, "could not be loaded", 502],
    ] as const)(
        "maps GitHub status %s to a domain error",
        async (status, message, expectedStatus) => {
            setFetch(vi.fn(async () => new Response(null, { status })));

            await expect(getGitHubMedia(sourceUrl)).rejects.toMatchObject({
                code: "GITHUB_INTEGRATION_FAILED",
                message: expect.stringContaining(message),
                status: expectedStatus,
            });
        },
    );

    test("rejects non-image responses and network failures", async () => {
        setFetch(
            vi.fn(
                async () =>
                    new Response("html", {
                        headers: { "content-type": "text/html" },
                    }),
            ),
        );
        await expect(getGitHubMedia(sourceUrl)).rejects.toMatchObject({
            status: 415,
        });

        setFetch(
            vi.fn(async () => {
                throw new Error("network unavailable");
            }),
        );
        await expect(getGitHubMedia(sourceUrl)).rejects.toMatchObject({
            status: 502,
        });
    });
});
