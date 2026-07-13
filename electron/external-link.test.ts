import { describe, expect, test } from "vitest";

import { isAllowedExternalUrl } from "./external-link.js";

describe("Electron external link policy", () => {
    test.each(["https://example.com/path", "http://localhost:33133/docs"])(
        "allows web URL %s",
        (url) => {
            expect(isAllowedExternalUrl(url)).toBe(true);
        },
    );

    test.each([
        "file:///etc/passwd",
        "javascript:alert(1)",
        "data:text/html,hello",
        "mailto:user@example.com",
        "not a URL",
    ])("rejects non-web URL %s", (url) => {
        expect(isAllowedExternalUrl(url)).toBe(false);
    });
});
