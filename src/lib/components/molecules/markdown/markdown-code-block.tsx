import {
    getSharedHighlighter,
    type DiffsHighlighter,
    type SupportedLanguages,
} from "@pierre/diffs";
import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/lib/components/ui/button";
import { tryPromise } from "@/lib/error";

const LANGUAGE_PATTERN = /(?:^|\s)language-([^\s]+)/;
const highlightedCodeCache = new Map<string, Promise<string | null>>();
const highlighterCache = new Map<string, Promise<DiffsHighlighter | null>>();

type MarkdownCodeBlockProps = {
    className?: string;
    code: string;
};

export function MarkdownCodeBlock({ className, code }: MarkdownCodeBlockProps) {
    const language = extractFenceLanguage(className);
    const theme = getResolvedTheme();
    const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const cacheKey = useMemo(
        () => `${theme}:${language}:${code}`,
        [code, language, theme],
    );

    useEffect(() => {
        let cancelled = false;

        setHighlightedHtml(null);
        getHighlightedCode(cacheKey, code, language, theme).then((html) => {
            if (!cancelled) {
                setHighlightedHtml(html);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [cacheKey, code, language, theme]);

    useEffect(
        () => () => {
            if (copiedTimer.current) {
                clearTimeout(copiedTimer.current);
            }
        },
        [],
    );

    async function copyCode() {
        if (!navigator.clipboard) {
            return;
        }

        const [error] = await tryPromise(navigator.clipboard.writeText(code));

        if (error) {
            return;
        }

        if (copiedTimer.current) {
            clearTimeout(copiedTimer.current);
        }

        setCopied(true);
        copiedTimer.current = setTimeout(() => setCopied(false), 1200);
    }

    return (
        <div
            className="border-border/80 bg-muted/25 my-3 overflow-hidden
                rounded-lg border"
        >
            <div
                className="border-border/70 bg-muted/30 text-muted-foreground
                    flex h-8 items-center justify-between border-b px-2.5
                    font-mono text-[10px]"
            >
                <span>{language}</span>
                <Button
                    aria-label={copied ? "Copied" : "Copy code"}
                    size="icon-xs"
                    variant="ghost"
                    onClick={copyCode}
                >
                    {copied ? (
                        <Check className="text-success size-3" />
                    ) : (
                        <Copy className="size-3" />
                    )}
                </Button>
            </div>
            {highlightedHtml ? (
                <div
                    className="[&_pre]:m-0! [&_pre]:overflow-x-auto
                        [&_pre]:bg-transparent! [&_pre]:p-3! [&_pre]:font-mono
                        [&_pre]:text-xs [&_pre]:leading-5"
                    dangerouslySetInnerHTML={{ __html: highlightedHtml }}
                />
            ) : (
                <pre
                    className="m-0 overflow-x-auto p-3 font-mono text-xs
                        leading-5"
                >
                    <code>{code}</code>
                </pre>
            )}
        </div>
    );
}

export function extractFenceLanguage(className?: string) {
    const language = className?.match(LANGUAGE_PATTERN)?.[1]?.toLowerCase();

    if (!language) {
        return "text";
    }

    return language === "gitignore" ? "ini" : language;
}

export function isDiffFenceLanguage(language: string) {
    return language.toLowerCase() === "diff";
}

async function getHighlighter(
    language: string,
): Promise<DiffsHighlighter | null> {
    const cached = highlighterCache.get(language);

    if (cached) {
        return cached;
    }

    const promise: Promise<DiffsHighlighter | null> = loadHighlighter(language);
    highlighterCache.set(language, promise);
    return promise;
}

async function loadHighlighter(
    language: string,
): Promise<DiffsHighlighter | null> {
    const [error, highlighter] = await tryPromise(
        getSharedHighlighter({
            langs: [language as SupportedLanguages],
            preferredHighlighter: "shiki-js",
            themes: ["pierre-dark", "pierre-light"],
        }),
    );

    if (!error) {
        return highlighter;
    }

    if (language === "text") {
        return null;
    }

    return getHighlighter("text");
}

function getHighlightedCode(
    cacheKey: string,
    code: string,
    language: string,
    theme: "pierre-dark" | "pierre-light",
) {
    const cached = highlightedCodeCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const promise = highlightCode(code, language, theme);
    highlightedCodeCache.set(cacheKey, promise);
    return promise;
}

async function highlightCode(
    code: string,
    language: string,
    theme: "pierre-dark" | "pierre-light",
) {
    const highlighter = await getHighlighter(language);

    if (!highlighter) {
        return null;
    }

    const [error, html] = await tryPromise(
        Promise.resolve().then(() =>
            highlighter.codeToHtml(code, {
                lang: language as SupportedLanguages,
                theme,
            }),
        ),
    );

    if (!error) {
        return html;
    }

    const [fallbackError, fallbackHtml] = await tryPromise(
        Promise.resolve().then(() =>
            highlighter.codeToHtml(code, { lang: "text", theme }),
        ),
    );

    return fallbackError ? null : fallbackHtml;
}

function getResolvedTheme() {
    if (typeof document === "undefined") {
        return "pierre-light" as const;
    }

    return document.documentElement.dataset.theme === "dark"
        ? ("pierre-dark" as const)
        : ("pierre-light" as const);
}
