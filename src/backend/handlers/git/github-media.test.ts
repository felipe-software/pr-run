import { describe, expect, test } from "bun:test";

import { parseGitHubMediaUrl } from "@/backend/handlers/git/github-media";

describe("GitHub media", () => {
    test("accepts GitHub user attachment images", async () => {
        await expect(
            parseGitHubMediaUrl(
                "https://github.com/user-attachments/assets/b747a432-9bac-4c9e-8430-8477b285abd8",
            ),
        ).resolves.toBe(
            "https://github.com/user-attachments/assets/b747a432-9bac-4c9e-8430-8477b285abd8",
        );
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
});
