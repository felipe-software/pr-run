import { describe, expect, test } from "bun:test";

import { resolveGitHubMarkdownUrl } from "@/lib/components/templates/main-panel/activity/activity-item";

describe("resolveGitHubMarkdownUrl", () => {
    test("resolves repository-relative links", () => {
        const repository = "https://github.com/example/repo";

        expect(
            resolveGitHubMarkdownUrl(
                "/docs/CONTRIBUTING.md",
                repository,
                "feature/ui",
            ),
        ).toBe(
            "https://github.com/example/repo/blob/feature/ui/docs/CONTRIBUTING.md",
        );
        expect(
            resolveGitHubMarkdownUrl(
                "../blob/main/image.png?raw=true",
                repository,
                "feature/ui",
            ),
        ).toBe("https://github.com/example/repo/blob/main/image.png?raw=true");
    });

    test("keeps absolute links and rejects unsafe protocols", () => {
        expect(
            resolveGitHubMarkdownUrl(
                "https://example.com/image.png",
                "https://github.com/example/repo",
                "main",
            ),
        ).toBe("https://example.com/image.png");
        expect(
            resolveGitHubMarkdownUrl(
                "javascript:alert(1)",
                "https://github.com/example/repo",
                "main",
            ),
        ).toBe("");
    });
});
