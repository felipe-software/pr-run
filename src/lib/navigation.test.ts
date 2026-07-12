import { describe, expect, test } from "bun:test";

import { appRoutePath, readAppRoute } from "@/lib/navigation";

describe("application routes", () => {
    test("round trips branch names containing slashes", () => {
        const path = appRoutePath({
            branchName: "feature/browser-tabs",
            projectId: "project one",
            type: "branch",
        });

        expect(path).toBe(
            "/branch/project%20one/feature%2Fbrowser-tabs/activity",
        );
        expect(readAppRoute(new URL(path, "https://pr-run.local"))).toEqual({
            branchName: "feature/browser-tabs",
            page: "activity",
            projectId: "project one",
            type: "branch",
        });
    });

    test("reads project and settings pages", () => {
        expect(
            readAppRoute(new URL("/project/pr-run", "https://pr-run.local")),
        ).toEqual({ projectId: "pr-run", type: "overview" });
        expect(
            readAppRoute(new URL("/settings/hotkeys", "https://pr-run.local")),
        ).toEqual({ section: "hotkeys", type: "settings" });
    });

    test("keeps each branch subpage addressable", () => {
        expect(
            readAppRoute(
                new URL(
                    "/branch/pr-run/feature%2Ftabs/changes",
                    "https://pr-run.local",
                ),
            ),
        ).toEqual({
            branchName: "feature/tabs",
            page: "changes",
            projectId: "pr-run",
            type: "branch",
        });
    });
});
