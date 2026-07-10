import {
    ChevronsUpDown,
    Columns2,
    Files,
    List,
    MessageSquareText,
    Rows3,
    WrapText,
} from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type DiffReviewMode = "continuous" | "focused";

type ChangesToolbarProps = {
    additions: number;
    deletions: number;
    fileCount: number;
    isUnified: boolean;
    mode: DiffReviewMode;
    pendingCommentCount: number;
    selectedPath?: string;
    shouldWrap: boolean;
    onChangeMode: (mode: DiffReviewMode) => void;
    onOpenFiles: () => void;
    onOpenReview: () => void;
    onToggleUnified: () => void;
    onToggleWrap: () => void;
};

export function ChangesToolbar({
    additions,
    deletions,
    fileCount,
    isUnified,
    mode,
    pendingCommentCount,
    selectedPath,
    shouldWrap,
    onChangeMode,
    onOpenFiles,
    onOpenReview,
    onToggleUnified,
    onToggleWrap,
}: ChangesToolbarProps) {
    return (
        <div
            className="border-border bg-background/95 flex min-h-11 shrink-0
                flex-wrap items-center justify-between gap-2 border-b px-2.5
                py-1.5 backdrop-blur"
        >
            <div className="flex min-w-0 items-center gap-2">
                <Button size="sm" variant="ghost" onClick={onOpenFiles}>
                    <Files className="size-3.5" />
                    <span className="max-w-72 truncate">
                        {mode === "focused" && selectedPath
                            ? selectedPath
                            : `${fileCount} changed files`}
                    </span>
                    <ChevronsUpDown className="size-3" />
                </Button>
                <span
                    className="hidden font-mono text-[11px] tabular-nums
                        sm:inline"
                >
                    <span className="text-success">+{additions}</span>{" "}
                    <span className="text-danger">−{deletions}</span>
                </span>
            </div>

            <div className="flex items-center gap-1.5">
                <div
                    aria-label="Diff review mode"
                    className="border-border/80 bg-muted/20 flex rounded-md
                        border p-0.5"
                >
                    <ModeButton
                        active={mode === "continuous"}
                        icon={Rows3}
                        label="Continuous"
                        onClick={() => onChangeMode("continuous")}
                    />
                    <ModeButton
                        active={mode === "focused"}
                        icon={List}
                        label="Focused"
                        onClick={() => onChangeMode("focused")}
                    />
                </div>
                <Button
                    aria-label={
                        isUnified ? "Use split diff" : "Use unified diff"
                    }
                    size="icon-sm"
                    variant="ghost"
                    onClick={onToggleUnified}
                >
                    <Columns2 className="size-3.5" />
                </Button>
                <Button
                    aria-label={
                        shouldWrap ? "Disable line wrapping" : "Wrap lines"
                    }
                    size="icon-sm"
                    variant={shouldWrap ? "outline" : "ghost"}
                    onClick={onToggleWrap}
                >
                    <WrapText className="size-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={onOpenReview}>
                    <MessageSquareText className="size-3.5" />
                    Review
                    {pendingCommentCount > 0 ? (
                        <span
                            className="bg-primary text-primary-foreground grid
                                min-w-4 place-items-center rounded px-1
                                text-[10px]"
                        >
                            {pendingCommentCount}
                        </span>
                    ) : null}
                </Button>
            </div>
        </div>
    );
}

function ModeButton({
    active,
    icon: Icon,
    label,
    onClick,
}: {
    active: boolean;
    icon: typeof Rows3;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            aria-pressed={active}
            className={cn(
                `text-muted-foreground flex h-6 items-center gap-1 rounded px-2
                text-[11px] font-medium transition-colors`,
                active && "bg-surface text-foreground shadow-sm/5",
            )}
            type="button"
            onClick={onClick}
        >
            <Icon className="size-3" />
            <span className="max-[720px]:hidden">{label}</span>
        </button>
    );
}
