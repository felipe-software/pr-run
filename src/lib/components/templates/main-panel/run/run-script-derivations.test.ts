import { describe, expect, test } from "vitest";

import {
    deriveRunScriptLists,
    filterPackageScriptGroups,
} from "@/lib/components/templates/main-panel/run/run-script-derivations";
import { getPackageScriptKey } from "@/lib/hooks/store/use-package-script-favorites-store";
import type {
    PackageScriptCatalog,
    PackageScriptInfo,
    ScriptInfo,
} from "@/types/pr-run";

function packageScript(
    name: string,
    packagePath: string,
    quick = false,
): PackageScriptInfo {
    return {
        command: `run ${name}`,
        name,
        packageName: packagePath === "." ? "root" : "workspace",
        packagePath,
        quick,
    };
}

function customScript(id: string, button: boolean): ScriptInfo {
    return {
        button,
        fileName: `${id}.ts`,
        filePath: `/scripts/${id}.ts`,
        id,
        lifecycles: [],
        title: id,
    };
}

const lint = packageScript("lint", ".", true);
const testScript = packageScript("test", "packages/app", true);
const build = packageScript("build", "packages/app");
const catalog: PackageScriptCatalog = {
    manager: "bun",
    packages: [
        { name: "root", path: ".", scripts: [lint] },
        { name: "app", path: "packages/app", scripts: [testScript, build] },
    ],
    quickScripts: [lint, testScript],
};

describe("deriveRunScriptLists", () => {
    test("preserves favorite order and excludes favorites from suggestions", () => {
        const result = deriveRunScriptLists(
            catalog,
            [customScript("visible", true), customScript("hidden", false)],
            [
                getPackageScriptKey(testScript),
                "missing\u0000script",
                getPackageScriptKey(lint),
            ],
        );

        expect(result.favoriteScripts).toEqual([testScript, lint]);
        expect(result.suggestedScripts).toEqual([]);
        expect(result.customActions.map((script) => script.id)).toEqual([
            "visible",
        ]);
        expect(result.scriptCount).toBe(3);
    });

    test("returns empty package collections when no catalog is loaded", () => {
        const result = deriveRunScriptLists(
            undefined,
            [customScript("visible", true)],
            [getPackageScriptKey(lint)],
        );

        expect(result.favoriteScripts).toEqual([]);
        expect(result.suggestedScripts).toEqual([]);
        expect(result.scriptCount).toBe(0);
        expect(result.customActions).toHaveLength(1);
    });
});

describe("filterPackageScriptGroups", () => {
    test("filters by script name, command, and package name without empty groups", () => {
        expect(
            filterPackageScriptGroups(catalog.packages, "WORKSPACE"),
        ).toEqual([catalog.packages[1]]);
        expect(filterPackageScriptGroups(catalog.packages, "run lint")).toEqual(
            [catalog.packages[0]],
        );
        expect(filterPackageScriptGroups(catalog.packages, "missing")).toEqual(
            [],
        );
    });
});
