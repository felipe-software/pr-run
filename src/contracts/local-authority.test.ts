import { describe, expect, test } from "vitest";

import { normalizeLoopbackHttpUrl } from "@/contracts/local-authority";

describe("local authority URLs", () => {
    test.each([
        ["http://127.0.0.1:33134", "http://127.0.0.1:33134"],
        ["http://localhost:33134/", "http://localhost:33134"],
        ["HTTP://LOCALHOST:80", "http://localhost"],
        ["http://[::1]:33134", "http://[::1]:33134"],
    ])("accepts loopback HTTP URL %s", (value, expected) => {
        expect(normalizeLoopbackHttpUrl(value)).toBe(expected);
    });

    test.each([
        "https://localhost:33134",
        "http://127.0.0.2:33134",
        "http://example.com:33134",
        "http://localhost.example.com:33134",
        "http://[::2]:33134",
        "http://user:secret@localhost:33134",
        "http://localhost:33134/api",
        "http://localhost:33134?token=secret",
        "not a URL",
    ])("rejects non-local authority URL %s", (value) => {
        expect(normalizeLoopbackHttpUrl(value)).toBeNull();
    });
});
