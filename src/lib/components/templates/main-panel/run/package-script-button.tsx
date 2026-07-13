import { Box, Play, Star } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import type { PackageScriptInfo } from "@/types/pr-run";

type PackageScriptButtonProps = {
    isFavorite?: boolean;
    isPreparing: boolean;
    onRun: (script: PackageScriptInfo) => Promise<void>;
    onToggleFavorite: () => void;
    script: PackageScriptInfo;
};

export function PackageScriptButton({
    isFavorite = false,
    isPreparing,
    onRun,
    onToggleFavorite,
    script,
}: PackageScriptButtonProps) {
    return (
        <div
            className="group/script border-border/70 bg-background
                hover:bg-muted/30 flex h-12 min-w-44 flex-1 items-stretch
                overflow-hidden rounded-md border transition-colors"
        >
            <button
                className="focus-visible:ring-ring flex min-w-0 flex-1
                    items-center gap-2 px-2 text-left outline-none
                    focus-visible:ring-2 disabled:opacity-60"
                disabled={isPreparing}
                type="button"
                onClick={() => onRun(script)}
            >
                <span
                    className="bg-primary/10 text-primary flex size-7 shrink-0
                        items-center justify-center rounded-md"
                >
                    {script.packagePath === "." ? (
                        <Play className="size-3.5" />
                    ) : (
                        <Box className="size-3.5" />
                    )}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                        {isPreparing ? "Preparing…" : script.name}
                    </span>
                    <span
                        className="text-muted-foreground block truncate
                            font-mono text-[10px]"
                    >
                        {script.packagePath === "."
                            ? script.command
                            : `${script.packageName} · ${script.command}`}
                    </span>
                </span>
            </button>
            <Button
                aria-label={`${isFavorite ? "Remove" : "Add"} ${script.name} ${isFavorite ? "from" : "to"} favorites`}
                className={
                    isFavorite
                        ? "text-warning opacity-100"
                        : `text-muted-foreground opacity-0
                            group-focus-within/script:opacity-100
                            group-hover/script:opacity-100`
                }
                size="icon-xs"
                variant="ghost"
                onClick={onToggleFavorite}
            >
                <Star
                    className="size-3.5"
                    fill={isFavorite ? "currentColor" : "none"}
                />
            </Button>
        </div>
    );
}
