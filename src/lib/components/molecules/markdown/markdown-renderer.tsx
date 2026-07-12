import {
    Children,
    isValidElement,
    type ComponentProps,
    type ReactNode,
    useEffect,
    useMemo,
    useState,
} from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { MarkdownCodeBlock } from "@/lib/components/molecules/markdown/markdown-code-block";
import { resolveGitHubMediaUrl } from "@/lib/api";
import { tryPromise } from "@/lib/error";
import { cn } from "@/lib/utils/cn";

const markdownSanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        code: [
            ...(defaultSchema.attributes?.code ?? []),
            ["className", /^language-[\w-]+$/],
        ],
        input: [
            ...(defaultSchema.attributes?.input ?? []),
            ["type", "checkbox"],
            "checked",
            "disabled",
        ],
    },
    tagNames: [...(defaultSchema.tagNames ?? []), "details", "summary"],
} satisfies Parameters<typeof rehypeSanitize>[0];

const resolvedImageUrlCache = new Map<string, string>();

export type MarkdownRendererProps = {
    className?: string;
    emptyMessage?: string;
    imageUrlTransform?: (url: string) => Promise<string>;
    markdown: string;
    mediaAlignment?: "left" | "right";
    urlTransform?: (url: string) => string;
};

export function MarkdownRenderer({
    className,
    emptyMessage = "Nothing to preview.",
    imageUrlTransform = resolveGitHubMediaUrl,
    markdown,
    mediaAlignment,
    urlTransform = safeMarkdownUrl,
}: MarkdownRendererProps) {
    const components = useMemo(
        () => ({
            a: MarkdownLink,
            img: (props: ComponentProps<"img">) => (
                <MarkdownImage
                    {...props}
                    imageUrlTransform={imageUrlTransform}
                />
            ),
            input: MarkdownInput,
            pre: MarkdownPre,
            table: MarkdownTable,
        }),
        [imageUrlTransform],
    );

    if (isBlankMarkdown(markdown)) {
        return (
            <p className="text-muted-foreground py-2 text-sm">{emptyMessage}</p>
        );
    }

    return (
        <div
            className={cn(
                `text-foreground/90 [&_a]:text-primary
                [&_blockquote]:border-border
                [&_blockquote]:text-muted-foreground
                [&_details]:border-border/70 [&_h1]:border-border/70
                [&_h2]:border-border/70 [&_hr]:border-border/70
                [&_:not(pre)>code]:bg-muted max-w-full min-w-0 text-sm leading-6
                [&_.contains-task-list]:list-none [&_.contains-task-list]:pl-1
                [&_.task-list-item]:flex [&_.task-list-item]:items-start
                [&_.task-list-item]:gap-2 [&_.task-list-item>input]:mt-1.5
                [&_:not(pre)>code]:rounded [&_:not(pre)>code]:px-1
                [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-[0.88em]
                [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:my-3
                [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_code]:font-mono
                [&_details]:my-3 [&_details]:rounded-md [&_details]:border
                [&_details]:px-3 [&_details]:py-2 [&_h1]:mt-5 [&_h1]:mb-3
                [&_h1]:border-b [&_h1]:pb-2 [&_h1]:text-xl [&_h1]:font-semibold
                [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:pb-1.5
                [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
                [&_h3]:text-base [&_h3]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1
                [&_h4]:font-semibold [&_hr]:my-4 [&_img]:max-h-full
                [&_img]:max-w-full [&_img]:object-contain [&_li]:my-0.5
                [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2
                [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
                [&_summary]:cursor-pointer [&_summary]:font-medium [&_ul]:my-2
                [&_ul]:list-disc [&_ul]:pl-6`,
                mediaAlignment &&
                    `[&_[data-markdown-image-frame]]:block [&_a:has(>img)]:block
                    [&_img]:block`,
                mediaAlignment === "left" &&
                    `[&_[data-markdown-image-frame]]:mr-auto
                    [&_[data-markdown-image-frame]]:ml-0 [&_img]:mr-auto
                    [&_img]:ml-0 [&_p:has(img)]:text-left`,
                mediaAlignment === "right" &&
                    `[&_[data-markdown-image-frame]]:mr-0
                    [&_[data-markdown-image-frame]]:ml-auto [&_img]:mr-0
                    [&_img]:ml-auto [&_p:has(img)]:text-right`,
                className,
            )}
        >
            <ReactMarkdown
                components={components}
                rehypePlugins={[
                    rehypeRaw,
                    [rehypeSanitize, markdownSanitizeSchema],
                ]}
                remarkPlugins={[remarkGfm]}
                urlTransform={urlTransform}
            >
                {markdown}
            </ReactMarkdown>
        </div>
    );
}

export function isBlankMarkdown(markdown: string) {
    return markdown.trim().length === 0;
}

export function safeMarkdownUrl(url: string) {
    return defaultUrlTransform(url);
}

function MarkdownLink({ href, ...props }: ComponentProps<"a">) {
    const isDocumentLink = href?.startsWith("#");

    return (
        <a
            {...props}
            href={href}
            rel={isDocumentLink ? undefined : "noreferrer noopener"}
            target={isDocumentLink ? undefined : "_blank"}
        />
    );
}

function MarkdownInput({ checked, type, ...props }: ComponentProps<"input">) {
    return <input {...props} checked={checked} disabled readOnly type={type} />;
}

function MarkdownImage({
    alt,
    imageUrlTransform,
    src,
    ...props
}: ComponentProps<"img"> & {
    imageUrlTransform: (url: string) => Promise<string>;
}) {
    const [failed, setFailed] = useState(false);
    const [resolvedImage, setResolvedImage] = useState(() => {
        const cachedSource = src ? resolvedImageUrlCache.get(src) : undefined;

        return cachedSource
            ? { originalSource: src, resolvedSource: cachedSource }
            : undefined;
    });
    const resolvedSource =
        resolvedImage && resolvedImage.originalSource === src
            ? resolvedImage.resolvedSource
            : undefined;

    useEffect(() => {
        let isActive = true;
        setFailed(false);

        if (!src) {
            return;
        }

        const cachedSource = resolvedImageUrlCache.get(src);

        if (cachedSource) {
            setResolvedImage({
                originalSource: src,
                resolvedSource: cachedSource,
            });
            return;
        }

        async function resolveSource() {
            const [error, transformedSource] = await tryPromise(
                imageUrlTransform(src!),
            );

            if (!isActive) {
                return;
            }

            if (error) {
                setFailed(true);
                return;
            }

            resolvedImageUrlCache.set(src!, transformedSource);
            setResolvedImage({
                originalSource: src!,
                resolvedSource: transformedSource,
            });
        }

        resolveSource();

        return () => {
            isActive = false;
        };
    }, [imageUrlTransform, src]);

    if (!src) {
        return null;
    }

    return (
        <span
            className="bg-muted/20 my-3 block aspect-video w-[36rem] max-w-full
                overflow-hidden rounded-md"
            data-markdown-image-frame=""
        >
            {failed ? (
                <a
                    className="text-muted-foreground flex h-full items-center
                        justify-center px-4 text-center text-xs"
                    href={src}
                    rel="noreferrer noopener"
                    target="_blank"
                >
                    {alt ? `Open image: ${alt}` : "Open image on GitHub"}
                </a>
            ) : resolvedSource ? (
                <img
                    {...props}
                    alt={alt ?? ""}
                    className={cn(
                        "!m-0 h-full w-full rounded-md object-contain",
                        props.className,
                    )}
                    src={resolvedSource}
                    onError={() => setFailed(true)}
                />
            ) : (
                <span
                    aria-label={alt ? `Loading image: ${alt}` : "Loading image"}
                    className="bg-muted/60 block h-full w-full animate-pulse"
                    role="img"
                />
            )}
        </span>
    );
}

function MarkdownPre({ children }: { children?: ReactNode }) {
    const code = extractCodeBlock(children);

    if (!code) {
        return <pre>{children}</pre>;
    }

    return <MarkdownCodeBlock className={code.className} code={code.content} />;
}

function MarkdownTable(props: ComponentProps<"table">) {
    return (
        <div
            className="border-border/70 my-3 max-w-full overflow-x-auto
                rounded-md border"
        >
            <table
                {...props}
                className="[&_td]:border-border/60 [&_th]:bg-muted/40 w-full
                    border-collapse text-left text-sm [&_td]:border-t
                    [&_td]:px-3 [&_td]:py-1.5 [&_th]:px-3 [&_th]:py-1.5
                    [&_th]:font-semibold"
            />
        </div>
    );
}

function extractCodeBlock(children: ReactNode) {
    const child = Children.toArray(children)[0];

    if (
        !isValidElement<{ children?: ReactNode; className?: string }>(child) ||
        child.type !== "code"
    ) {
        return undefined;
    }

    return {
        className: child.props.className,
        content: nodeToText(child.props.children).replace(/\n$/, ""),
    };
}

function nodeToText(node: ReactNode): string {
    if (typeof node === "string" || typeof node === "number") {
        return String(node);
    }

    return Children.toArray(node).map(nodeToText).join("");
}
