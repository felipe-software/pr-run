import { describe, expect, test } from "bun:test";

import { validateReviewSubmission } from "@/backend/handlers/git/github-review";

describe("validateReviewSubmission", () => {
    test("requires content for new comment reviews", () => {
        expect(() => validateReviewSubmission("COMMENT", "", 0)).toThrow();
        expect(validateReviewSubmission("COMMENT", " summary ", 0)).toBe(
            "summary",
        );
    });

    test("allows pending inline comments without a summary", () => {
        expect(validateReviewSubmission("COMMENT", undefined, 2)).toBe("");
    });

    test("always requires a requested-changes explanation", () => {
        expect(() =>
            validateReviewSubmission("REQUEST_CHANGES", "", 2),
        ).toThrow();
    });
});
