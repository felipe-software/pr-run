import { ChevronRight, Package } from "lucide-react";

import { Surface } from "@/lib/components/atoms/surface";
import { CustomActions } from "@/lib/components/templates/main-panel/run/custom-actions";
import { PackageScriptButton } from "@/lib/components/templates/main-panel/run/package-script-button";
import { Button } from "@/lib/components/ui/button";
import { getPackageScriptKey } from "@/lib/hooks/store/use-package-script-favorites-store";
import type {
    PackageScriptCatalog,
    PackageScriptInfo,
    ScriptInfo,
} from "@/types/pr-run";

type PackageScriptsSectionProps = {
    catalog?: PackageScriptCatalog;
    customActions: ScriptInfo[];
    deletingScriptId?: string;
    isLoading: boolean;
    isPreparingPackageScript: (script: PackageScriptInfo) => boolean;
    onCreateScript: () => void;
    onDeleteScript: (script: ScriptInfo) => void;
    onEditScript: (script: ScriptInfo) => void;
    onOpenPicker: () => void;
    onRunCustomScript: (script: ScriptInfo) => Promise<void>;
    onRunPackageScript: (script: PackageScriptInfo) => Promise<void>;
    onToggleFavorite: (script: PackageScriptInfo) => void;
    preparingCustomScriptId?: string;
    scriptCount: number;
    suggestedScripts: PackageScriptInfo[];
};

export function PackageScriptsSection({
    catalog,
    customActions,
    deletingScriptId,
    isLoading,
    isPreparingPackageScript,
    onCreateScript,
    onDeleteScript,
    onEditScript,
    onOpenPicker,
    onRunCustomScript,
    onRunPackageScript,
    onToggleFavorite,
    preparingCustomScriptId,
    scriptCount,
    suggestedScripts,
}: PackageScriptsSectionProps) {
    return (
        <Surface className="overflow-hidden">
            <div
                className="flex flex-wrap items-start justify-between gap-3 px-3
                    py-2.5"
            >
                <div>
                    <div className="flex items-center gap-1.5">
                        <Package className="text-muted-foreground size-4" />
                        <h2 className="text-sm font-semibold">
                            Suggested scripts
                        </h2>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                        {catalog
                            ? `${scriptCount} detected · ${catalog.manager}`
                            : "Detecting scripts from this worktree…"}
                    </p>
                </div>
                {catalog && scriptCount > 0 ? (
                    <Button size="xs" variant="outline" onClick={onOpenPicker}>
                        Browse all scripts
                        <ChevronRight className="size-3.5" />
                    </Button>
                ) : null}
            </div>

            {suggestedScripts.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 px-2.5 pb-2.5">
                    {suggestedScripts.map((script) => (
                        <PackageScriptButton
                            isPreparing={isPreparingPackageScript(script)}
                            key={getPackageScriptKey(script)}
                            script={script}
                            onRun={onRunPackageScript}
                            onToggleFavorite={() => onToggleFavorite(script)}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-muted-foreground px-3 pb-2.5 text-xs">
                    {scriptCount > 0
                        ? "All suggested scripts are already favorites."
                        : isLoading
                          ? "Detecting scripts from this worktree…"
                          : "No package scripts were found in this worktree."}
                </p>
            )}

            <CustomActions
                deletingId={deletingScriptId}
                onCreate={onCreateScript}
                onDelete={onDeleteScript}
                onEdit={onEditScript}
                onRun={onRunCustomScript}
                preparingId={preparingCustomScriptId}
                scripts={customActions}
            />
        </Surface>
    );
}
