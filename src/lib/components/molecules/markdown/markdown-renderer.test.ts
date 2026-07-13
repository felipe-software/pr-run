import { describe, expect, test } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
    extractFenceLanguage,
    isDiffFenceLanguage,
} from "@/lib/components/molecules/markdown/markdown-code-block";
import {
    isBlankMarkdown,
    MarkdownRenderer,
    safeMarkdownUrl,
} from "@/lib/components/molecules/markdown/markdown-renderer";

describe("markdown helpers", () => {
    test("extracts fenced code languages", () => {
        expect(extractFenceLanguage("language-typescript")).toBe("typescript");
        expect(extractFenceLanguage("foo language-diff bar")).toBe("diff");
        expect(extractFenceLanguage()).toBe("text");
        expect(extractFenceLanguage("language-gitignore")).toBe("ini");
    });

    test("recognizes diff fences", () => {
        expect(isDiffFenceLanguage("diff")).toBe(true);
        expect(isDiffFenceLanguage("DIFF")).toBe(true);
        expect(isDiffFenceLanguage("typescript")).toBe(false);
    });

    test("detects empty previews", () => {
        expect(isBlankMarkdown(" \n\t")).toBe(true);
        expect(isBlankMarkdown("# Review")).toBe(false);
    });

    test("keeps safe URLs and rejects unsafe protocols", () => {
        expect(safeMarkdownUrl("https://example.com")).toBe(
            "https://example.com",
        );
        expect(safeMarkdownUrl("http://example.com/path")).toBe(
            "http://example.com/path",
        );
        expect(safeMarkdownUrl("mailto:dev@example.com")).toBe(
            "mailto:dev@example.com",
        );
        expect(safeMarkdownUrl("../relative/path")).toBe("../relative/path");
        expect(safeMarkdownUrl("#review")).toBe("#review");
        expect(safeMarkdownUrl("javascript:alert(1)")).toBe("");
        expect(safeMarkdownUrl("data:text/html,unsafe")).toBe("");
    });

    test("renders the empty state and caller styling", () => {
        const html = renderToStaticMarkup(
            createElement(MarkdownRenderer, {
                className: "review-markdown",
                emptyMessage: "No review yet.",
                markdown: "\n\t",
            }),
        );

        expect(html).toContain("No review yet.");
        expect(html).not.toContain("review-markdown");
    });

    test("renders GFM structure with safe link behavior", () => {
        const html = renderToStaticMarkup(
            createElement(MarkdownRenderer, {
                className: "review-markdown",
                markdown: [
                    "# Review",
                    "",
                    "- [x] tested",
                    "- [ ] documented",
                    "",
                    "| File | State |",
                    "| --- | --- |",
                    "| `app.ts` | ready |",
                    "",
                    "[Section](#details) [Docs](https://example.com/docs)",
                    "",
                    "<details><summary>More</summary>Safe details</details>",
                ].join("\n"),
            }),
        );

        expect(html).toContain("review-markdown");
        expect(html).toContain("<h1>Review</h1>");
        expect(html).toContain('type="checkbox"');
        expect(html).toContain("<table");
        expect(html).toContain("overflow-x-auto");
        expect(html).toContain('href="#details"');
        expect(html).not.toContain('href="#details" target=');
        expect(html).toContain('target="_blank"');
        expect(html).toContain('rel="noreferrer noopener"');
        expect(html).toContain("<details>");
    });

    test("renders fenced diffs through the code-block component", () => {
        const html = renderToStaticMarkup(
            createElement(MarkdownRenderer, {
                markdown: "```diff\n-old\n+new\n```",
            }),
        );

        expect(html).toContain("Copy code");
        expect(html).toContain("diff");
        expect(html).toContain("-old");
        expect(html).toContain("+new");
    });

    test("sanitizes raw HTML", () => {
        const html = renderToStaticMarkup(
            createElement(MarkdownRenderer, {
                markdown:
                    '<script>alert("unsafe")</script><strong>Safe</strong>',
            }),
        );

        expect(html).not.toContain("<script");
        expect(html).toContain("<strong>Safe</strong>");
    });

    test("reserves a stable frame while an image loads", () => {
        const html = renderToStaticMarkup(
            createElement(MarkdownRenderer, {
                markdown: "![Diff preview](https://example.com/diff.png)",
            }),
        );

        expect(html).toContain("data-markdown-image-frame");
        expect(html).toContain("aspect-video");
        expect(html).toContain("w-[36rem]");
        expect(html).toContain("Loading image: Diff preview");
    });

    test("supports aligned images without alternative text", () => {
        const html = renderToStaticMarkup(
            createElement(MarkdownRenderer, {
                markdown: "![](https://example.com/diff.png)",
                mediaAlignment: "right",
            }),
        );

        expect(html).toContain("data-markdown-image-frame");
        expect(html).toContain("Loading image");
        expect(html).toContain("text-right");
        expect(html).toContain("ml-auto");
    });
});
