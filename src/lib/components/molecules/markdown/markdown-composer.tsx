import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import { MarkdownRenderer } from "@/lib/components/molecules/markdown/markdown-renderer";
import { Button } from "@/lib/components/ui/button";
import { Textarea } from "@/lib/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

type MarkdownComposerMode = "preview" | "write";

export type MarkdownComposerProps = {
    ariaLabel: string;
    autoFocus?: boolean;
    className?: string;
    disabled?: boolean;
    footer?: ReactNode;
    onChange: (value: string) => void;
    placeholder?: string;
    textareaClassName?: string;
    value: string;
};

export function MarkdownComposer({
    ariaLabel,
    autoFocus,
    className,
    disabled,
    footer,
    onChange,
    placeholder,
    textareaClassName,
    value,
}: MarkdownComposerProps) {
    const [mode, setMode] = useState<MarkdownComposerMode>("write");
    const id = useId();
    const writeTabId = `${id}-write-tab`;
    const previewTabId = `${id}-preview-tab`;
    const writePanelId = `${id}-write-panel`;
    const previewPanelId = `${id}-preview-panel`;

    function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (
            event.key !== "ArrowLeft" &&
            event.key !== "ArrowRight" &&
            event.key !== "Home" &&
            event.key !== "End"
        ) {
            return;
        }

        event.preventDefault();
        const nextMode =
            event.key === "ArrowLeft" || event.key === "Home"
                ? "write"
                : "preview";
        setMode(nextMode);
        document
            .getElementById(nextMode === "write" ? writeTabId : previewTabId)
            ?.focus();
    }

    return (
        <div
            className={cn(
                `border-input bg-background overflow-hidden rounded-lg border
                shadow-sm/5`,
                className,
            )}
        >
            <div
                aria-label={`${ariaLabel} mode`}
                className="border-border/70 bg-muted/15 flex h-9 items-end gap-1
                    border-b px-2"
                role="tablist"
                onKeyDown={handleTabKeyDown}
            >
                <ComposerTab
                    controls={writePanelId}
                    id={writeTabId}
                    label="Write"
                    selected={mode === "write"}
                    onSelect={() => setMode("write")}
                />
                <ComposerTab
                    controls={previewPanelId}
                    id={previewTabId}
                    label="Preview"
                    selected={mode === "preview"}
                    onSelect={() => setMode("preview")}
                />
            </div>
            <div
                aria-labelledby={writeTabId}
                hidden={mode !== "write"}
                id={writePanelId}
                role="tabpanel"
            >
                <Textarea
                    aria-label={ariaLabel}
                    autoFocus={autoFocus}
                    className={cn(
                        `min-h-24 rounded-none border-0 shadow-none
                        focus-visible:border-transparent focus-visible:ring-0`,
                        textareaClassName,
                    )}
                    disabled={disabled}
                    placeholder={placeholder}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            </div>
            <div
                aria-labelledby={previewTabId}
                className="min-h-24 px-3 py-2"
                hidden={mode !== "preview"}
                id={previewPanelId}
                role="tabpanel"
            >
                <MarkdownRenderer markdown={value} />
            </div>
            {footer ? (
                <div className="border-border/70 border-t px-2 py-2">
                    {footer}
                </div>
            ) : null}
        </div>
    );
}

function ComposerTab({
    controls,
    id,
    label,
    selected,
    onSelect,
}: {
    controls: string;
    id: string;
    label: string;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <Button
            aria-controls={controls}
            aria-selected={selected}
            className={cn(
                `h-8 rounded-b-none border-b-0 px-2.5 text-xs
                focus-visible:ring-offset-0`,
                selected
                    ? "border-input bg-background text-foreground"
                    : "text-muted-foreground",
            )}
            id={id}
            role="tab"
            size="xs"
            tabIndex={selected ? 0 : -1}
            variant={selected ? "outline" : "ghost"}
            onClick={onSelect}
        >
            {label}
        </Button>
    );
}
