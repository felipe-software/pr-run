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
        expect(safeMarkdownUrl("javascript:alert(1)")).toBe("");
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
});
