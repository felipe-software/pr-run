import { describe, expect, test } from "bun:test";

import {
    getActivityBottomDistance,
    isActivityNearBottom,
    resolveActivityHeaderCompact,
    resolveActivityRefreshAction,
} from "@/lib/components/templates/main-panel/activity/activity-scroll";

describe("activity scroll", () => {
    test("measures distance from the bottom", () => {
        expect(
            getActivityBottomDistance({
                clientHeight: 700,
                scrollHeight: 2_000,
                scrollTop: 1_200,
            }),
        ).toBe(100);
        expect(
            isActivityNearBottom({
                clientHeight: 700,
                scrollHeight: 2_000,
                scrollTop: 1_205,
            }),
        ).toBe(true);
    });

    test("initializes, pins, or notifies based on reading position", () => {
        expect(
            resolveActivityRefreshAction({
                isInitialized: false,
                wasNearBottom: false,
            }),
        ).toBe("initialize");
        expect(
            resolveActivityRefreshAction({
                isInitialized: true,
                wasNearBottom: true,
            }),
        ).toBe("pin");
        expect(
            resolveActivityRefreshAction({
                isInitialized: true,
                wasNearBottom: false,
            }),
        ).toBe("notify");
    });

    test("keeps the compact header stable between separate enter and exit thresholds", () => {
        expect(resolveActivityHeaderCompact(false, 95)).toBe(false);
        expect(resolveActivityHeaderCompact(false, 96)).toBe(true);
        expect(resolveActivityHeaderCompact(true, 52)).toBe(true);
        expect(resolveActivityHeaderCompact(true, 24)).toBe(false);
    });
});
