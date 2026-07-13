import { describe, expect, test } from "vitest";

import { createBackendApp } from "@/backend/http/app";
import { isAllowedRequestOrigin } from "@/backend/http/request-origin";

describe("backend request origin policy", () => {
    test.each([
        null,
        "null",
        "http://127.0.0.1:33133",
        "http://localhost:33133",
        "http://[::1]:33133",
    ])("accepts native or local renderer origin %s", (origin) => {
        expect(isAllowedRequestOrigin(origin)).toBe(true);
    });

    test.each([
        "https://localhost:33133",
        "https://example.com",
        "http://localhost.example.com:33133",
        "http://127.0.0.2:33133",
    ])("rejects untrusted renderer origin %s", (origin) => {
        expect(isAllowedRequestOrigin(origin)).toBe(false);
    });

    test("rejects an untrusted origin before a route runs", async () => {
        const response = await createBackendApp().handle(
            new Request("http://127.0.0.1:33134/health", {
                headers: { origin: "https://example.com" },
            }),
        );

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({
            type: "error",
            message: "Request origin is not allowed.",
            _metadata: { code: "FORBIDDEN_ORIGIN" },
        });
    });

    test("allows a loopback renderer origin", async () => {
        const response = await createBackendApp().handle(
            new Request("http://127.0.0.1:33134/health", {
                headers: { origin: "http://localhost:33133" },
            }),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("access-control-allow-origin")).toBe(
            "http://localhost:33133",
        );
    });
});
