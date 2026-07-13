import { ChevronRight, PackagePlus, Star } from "lucide-react";

import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { PackageScriptButton } from "@/lib/components/templates/main-panel/run/package-script-button";
import { Button } from "@/lib/components/ui/button";
import { getPackageScriptKey } from "@/lib/hooks/store/use-package-script-favorites-store";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { PackageScriptCatalog, PackageScriptInfo } from "@/types/pr-run";

type FavoriteScriptsSectionProps = {
    catalog?: PackageScriptCatalog;
    error: Error | null;
    favoriteScripts: PackageScriptInfo[];
    isLoading: boolean;
    isPreparing: (script: PackageScriptInfo) => boolean;
    onOpenPicker: () => void;
    onRun: (script: PackageScriptInfo) => Promise<void>;
    onToggleFavorite: (script: PackageScriptInfo) => void;
    scriptCount: number;
};

export function FavoriteScriptsSection({
    catalog,
    error,
    favoriteScripts,
    isLoading,
    isPreparing,
    onOpenPicker,
    onRun,
    onToggleFavorite,
    scriptCount,
}: FavoriteScriptsSectionProps) {
    return (
        <Surface className="overflow-hidden">
            <div
                className="flex flex-wrap items-start justify-between gap-3 px-3
                    py-2.5"
            >
                <div>
                    <div className="flex items-center gap-1.5">
                        <Star
                            className="text-warning size-4"
                            fill="currentColor"
                        />
                        <h2 className="text-sm font-semibold">
                            Favorite scripts
                        </h2>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                        Project scripts kept within one click on every branch.
                    </p>
                </div>
                <Button
                    disabled={!catalog || scriptCount === 0}
                    size="xs"
                    variant="outline"
                    onClick={onOpenPicker}
                >
                    <PackagePlus className="size-3.5" />
                    Import from package.json
                </Button>
            </div>

            {isLoading ? (
                <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
                    {["first", "second", "third"].map((key) => (
                        <Skeleton className="h-12 min-w-40 flex-1" key={key} />
                    ))}
                </div>
            ) : error && !catalog ? (
                <div className="text-danger px-3 pb-2.5 text-xs">
                    {getErrorMessage(error)} Custom actions and the terminal are
                    still available.
                </div>
            ) : favoriteScripts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
                    {favoriteScripts.map((script) => (
                        <PackageScriptButton
                            isFavorite
                            isPreparing={isPreparing(script)}
                            key={getPackageScriptKey(script)}
                            script={script}
                            onRun={onRun}
                            onToggleFavorite={() => onToggleFavorite(script)}
                        />
                    ))}
                </div>
            ) : (
                <div
                    className="border-border/70 bg-muted/20 mx-2.5 mb-2.5 flex
                        min-h-16 items-center justify-between gap-3 rounded-md
                        border border-dashed px-3 py-2"
                >
                    <div>
                        <p className="text-xs font-medium">
                            No favorite scripts yet
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[11px]">
                            Import the scripts you run most often from this
                            project&apos;s package.json files.
                        </p>
                    </div>
                    <Button
                        disabled={!catalog || scriptCount === 0}
                        size="xs"
                        variant="ghost"
                        onClick={onOpenPicker}
                    >
                        Choose scripts
                        <ChevronRight className="size-3.5" />
                    </Button>
                </div>
            )}
        </Surface>
    );
}
