import { describe, expect, test } from "vitest";

import { sidebarResize } from "@/lib/components/templates/sidebar/sidebar-resize";

describe("sidebarResize", () => {
    test("clamps widths to the configured sidebar limits", () => {
        expect(sidebarResize.clamp(100)).toBe(256);
        expect(sidebarResize.clamp(420)).toBe(420);
        expect(sidebarResize.clamp(700)).toBe(560);
    });

    test("reduces the effective maximum to preserve main content", () => {
        expect(sidebarResize.getEffectiveMaximumWidth(1_200)).toBe(560);
        expect(sidebarResize.getEffectiveMaximumWidth(1_024)).toBe(384);
        expect(sidebarResize.getEffectiveMaximumWidth(800)).toBe(256);
    });

    test("accepts boundary widths that preserve the main content minimum", () => {
        expect(sidebarResize.canAccept(384, 1_024)).toBe(true);
        expect(sidebarResize.canAccept(385, 1_024)).toBe(false);
        expect(sidebarResize.canAccept(560, 1_200)).toBe(true);
    });
});
