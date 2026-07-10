import { describe, expect, test } from "bun:test";

import { compareActivityItems } from "@/backend/handlers/git/activity";
import type { WorktreeActivityItem } from "@/backend/types";

describe("compareActivityItems", () => {
    test("sorts oldest activity first with stable ids", () => {
        const items = [
            { id: "b", occurredAt: "2026-07-10T00:00:00Z" },
            { id: "c", occurredAt: "2026-07-09T00:00:00Z" },
            { id: "a", occurredAt: "2026-07-10T00:00:00Z" },
        ] as WorktreeActivityItem[];

        expect(items.sort(compareActivityItems).map((item) => item.id)).toEqual(
            ["c", "a", "b"],
        );
    });
});
