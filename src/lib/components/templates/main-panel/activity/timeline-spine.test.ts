import { describe, expect, test } from "bun:test";

import { buildTimelineSpinePath } from "@/lib/components/templates/main-panel/activity/timeline-spine";

describe("buildTimelineSpinePath", () => {
    test("draws one vertical segment for consecutive items on the same side", () => {
        expect(
            buildTimelineSpinePath([
                { bottom: 80, top: 0, x: 28, y: 20 },
                { bottom: 180, top: 92, x: 28, y: 112 },
            ]),
        ).toBe("M28 20V112");
    });

    test("crosses between sides in the gap with rounded corners", () => {
        expect(
            buildTimelineSpinePath([
                { bottom: 80, top: 0, x: 28, y: 20 },
                { bottom: 180, top: 92, x: 300, y: 112 },
            ]),
        ).toBe("M28 20V80Q28 86 34 86H294Q300 86 300 92V112");
    });

    test("keeps alternating items on one continuous path", () => {
        const path = buildTimelineSpinePath([
            { bottom: 80, top: 0, x: 300, y: 20 },
            { bottom: 180, top: 92, x: 28, y: 112 },
            { bottom: 280, top: 192, x: 300, y: 212 },
        ]);

        expect(path.match(/M/g)).toHaveLength(1);
        expect(path).toEndWith("V212");
    });

    test("does not draw a line until two activity nodes exist", () => {
        expect(buildTimelineSpinePath([])).toBe("");
        expect(
            buildTimelineSpinePath([{ bottom: 80, top: 0, x: 28, y: 20 }]),
        ).toBe("");
    });
});
