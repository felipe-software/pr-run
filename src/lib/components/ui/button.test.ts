import { describe, expect, test } from "vitest";
import { createElement } from "react";

import { resolveButtonType } from "@/lib/components/ui/button";

describe("resolveButtonType", () => {
    test("defaults native and rendered buttons without affecting links", () => {
        expect(resolveButtonType(undefined)).toBe("button");
        expect(resolveButtonType(createElement("button"))).toBe("button");
        expect(resolveButtonType(createElement("a"))).toBeUndefined();
    });

    test("respects an explicit submit type", () => {
        expect(resolveButtonType(createElement("button"), "submit")).toBe(
            "submit",
        );
    });
});
