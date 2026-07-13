import { describe, expect, test } from "vitest";

import { getRovingFocusIndex } from "./roving-focus";

describe("getRovingFocusIndex", () => {
    test.each([
        ["ArrowRight", 1, 2],
        ["ArrowRight", 2, 0],
        ["ArrowLeft", 1, 0],
        ["ArrowLeft", 0, 2],
        ["Home", 2, 0],
        ["End", 0, 2],
    ])("handles %s from index %i", (key, currentIndex, expected) => {
        expect(getRovingFocusIndex(currentIndex, 3, key)).toBe(expected);
    });

    test.each([
        ["Enter", 1, 3],
        ["ArrowRight", -1, 3],
        ["ArrowRight", 0, 0],
    ])("ignores unsupported or invalid navigation", (key, index, count) => {
        expect(getRovingFocusIndex(index, count, key)).toBeNull();
    });
});
