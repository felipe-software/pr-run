import { describe, expect, test } from "bun:test";

import {
    formatActivityAbsoluteTime,
    formatActivityRelativeTime,
    getActivityTimeRefreshDelay,
} from "@/lib/components/templates/main-panel/activity/activity-date";

const NOW = Date.parse("2026-07-11T12:00:00.000Z");

describe("activity dates", () => {
    test("formats exact relative units", () => {
        expect(
            formatActivityRelativeTime("2026-07-11T11:59:29.000Z", NOW),
        ).toBe("31 seconds ago");
        expect(
            formatActivityRelativeTime("2026-07-11T11:59:00.000Z", NOW),
        ).toBe("1 minute ago");
        expect(
            formatActivityRelativeTime("2026-07-11T09:00:00.000Z", NOW),
        ).toBe("3 hours ago");
        expect(
            formatActivityRelativeTime("2026-07-03T12:00:00.000Z", NOW),
        ).toBe("8 days ago");
    });

    test("formats future activity and invalid values", () => {
        expect(
            formatActivityRelativeTime("2026-07-11T12:00:05.000Z", NOW),
        ).toBe("in 5 seconds");
        expect(formatActivityRelativeTime("not-a-date", NOW)).toBe(
            "not-a-date",
        );
        expect(formatActivityAbsoluteTime("not-a-date")).toBe("not-a-date");
        expect(
            formatActivityAbsoluteTime(
                "2026-07-11T12:00:05.000Z",
                "mm-dd-yyyy",
            ),
        ).toContain("07-11-2026");
    });

    test("schedules refreshes at meaningful boundaries", () => {
        expect(
            getActivityTimeRefreshDelay("2026-07-11T11:59:29.250Z", NOW),
        ).toBe(270);
        expect(
            getActivityTimeRefreshDelay("2026-07-11T11:57:30.000Z", NOW),
        ).toBe(30_020);
        expect(getActivityTimeRefreshDelay("not-a-date", NOW)).toBeNull();
    });
});
