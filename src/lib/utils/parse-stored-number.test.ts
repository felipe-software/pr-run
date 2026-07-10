import { describe, expect, test } from "bun:test";

import { parseStoredNumber } from "@/lib/utils/parse-stored-number";

describe("parseStoredNumber", () => {
    test("distinguishes missing and invalid values from numeric zero", () => {
        expect(parseStoredNumber(null)).toBeNull();
        expect(parseStoredNumber("invalid")).toBeNull();
        expect(parseStoredNumber("0")).toBe(0);
        expect(parseStoredNumber("320")).toBe(320);
    });
});
