import { getPackageScriptKey } from "@/lib/hooks/store/use-package-script-favorites-store";
import type {
    PackageScriptCatalog,
    PackageScriptGroup,
    ScriptInfo,
} from "@/types/pr-run";

export function deriveRunScriptLists(
    catalog: PackageScriptCatalog | undefined,
    scripts: ScriptInfo[],
    favoriteKeys: string[],
) {
    const favoriteScriptKeys = new Set(favoriteKeys);
    const scriptsByKey = new Map(
        (catalog?.packages ?? []).flatMap((group) =>
            group.scripts.map((script) => [
                getPackageScriptKey(script),
                script,
            ]),
        ),
    );

    return {
        customActions: scripts.filter((script) => script.button),
        favoriteScriptKeys,
        favoriteScripts: favoriteKeys.flatMap((key) => {
            const script = scriptsByKey.get(key);
            return script ? [script] : [];
        }),
        scriptCount:
            catalog?.packages.reduce(
                (total, group) => total + group.scripts.length,
                0,
            ) ?? 0,
        suggestedScripts: (catalog?.quickScripts ?? []).filter(
            (script) => !favoriteScriptKeys.has(getPackageScriptKey(script)),
        ),
    };
}

export function filterPackageScriptGroups(
    groups: PackageScriptGroup[],
    search: string,
) {
    const normalizedSearch = search.trim().toLowerCase();

    return groups
        .map((group) => ({
            ...group,
            scripts: group.scripts.filter((script) =>
                `${script.name} ${script.command} ${script.packageName}`
                    .toLowerCase()
                    .includes(normalizedSearch),
            ),
        }))
        .filter((group) => group.scripts.length > 0);
}
