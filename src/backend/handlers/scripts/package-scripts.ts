import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { tryPromise } from "@/backend/handlers/error";
import { requireWorktreePath } from "@/backend/handlers/git/worktree-inventory";
import {
    ApiError,
    type PackageManager,
    type PackageScriptCatalog,
    type PackageScriptGroup,
    type PackageScriptInfo,
    type PackageScriptTerminalCommandResult,
    type ProjectConfig,
} from "@/backend/types";

type PackageManifest = {
    name?: string;
    packageManager?: string;
    scripts?: Record<string, string>;
    workspaces?: string[] | { packages?: string[] };
};

const QUICK_SCRIPT_PRIORITY = [
    "dev",
    "start",
    "test",
    "lint",
    "typecheck",
    "check",
    "build",
];

export async function getPackageScriptCatalog(
    project: ProjectConfig,
    branch: string,
): Promise<PackageScriptCatalog> {
    const worktreePath = await requireWorktreePath(project, branch);

    if (!worktreePath) {
        throw new ApiError(
            "WORKTREE_NOT_FOUND",
            "Create the worktree before reading package scripts.",
            404,
        );
    }

    const [error, catalog] = await tryPromise(readCatalog(worktreePath));

    if (error) {
        throw new ApiError(
            "PACKAGE_SCRIPTS_READ_FAILED",
            "Could not read package scripts from this worktree.",
            500,
            error.message,
        );
    }

    return catalog;
}

export async function preparePackageScriptTerminalCommand(
    project: ProjectConfig,
    branch: string,
    packagePath: string,
    scriptName: string,
): Promise<PackageScriptTerminalCommandResult> {
    const worktreePath = await requireWorktreePath(project, branch);

    if (!worktreePath) {
        throw new ApiError(
            "WORKTREE_NOT_FOUND",
            "Create the worktree before reading package scripts.",
            404,
        );
    }

    const catalog = await readCatalog(worktreePath);
    const script = catalog.packages
        .find((group) => group.path === packagePath)
        ?.scripts.find((item) => item.name === scriptName);

    if (!script) {
        throw new ApiError(
            "PACKAGE_SCRIPT_NOT_FOUND",
            "This package script no longer exists.",
            404,
        );
    }

    const command = buildPackageScriptCommand(
        catalog.manager,
        worktreePath,
        script,
        process.platform,
    );

    return {
        command,
        title: script.packageName
            ? `${script.packageName}: ${script.name}`
            : script.name,
    };
}

async function readCatalog(
    worktreePath: string,
): Promise<PackageScriptCatalog> {
    const rootManifest = await readManifest(
        path.join(worktreePath, "package.json"),
    );
    const manager = await detectPackageManager(worktreePath, rootManifest);
    const packagePaths = await discoverWorkspacePackagePaths(
        worktreePath,
        rootManifest,
    );
    const packages: PackageScriptGroup[] = [];

    for (const packagePath of [".", ...packagePaths]) {
        const manifest =
            packagePath === "."
                ? rootManifest
                : await readManifest(
                      path.join(worktreePath, packagePath, "package.json"),
                  );
        const scripts = Object.entries(manifest.scripts ?? {}).map(
            ([name, command]): PackageScriptInfo => ({
                command,
                name,
                packageName: manifest.name ?? packagePath,
                packagePath,
                quick: false,
            }),
        );

        if (scripts.length === 0) {
            continue;
        }

        packages.push({
            name: manifest.name ?? packagePath,
            path: packagePath,
            scripts,
        });
    }

    const quickScripts = rankQuickScripts(packages);
    const quickIds = new Set(
        quickScripts.map((script) => `${script.packagePath}:${script.name}`),
    );

    return {
        manager,
        packages: packages.map((group) => ({
            ...group,
            scripts: group.scripts.map((script) => ({
                ...script,
                quick: quickIds.has(`${script.packagePath}:${script.name}`),
            })),
        })),
        quickScripts: quickScripts.map((script) => ({
            ...script,
            quick: true,
        })),
    };
}

async function readManifest(filePath: string): Promise<PackageManifest> {
    const source = await readFile(filePath, "utf8");
    return JSON.parse(source) as PackageManifest;
}

async function discoverWorkspacePackagePaths(
    worktreePath: string,
    manifest: PackageManifest,
) {
    const patterns = Array.isArray(manifest.workspaces)
        ? manifest.workspaces
        : (manifest.workspaces?.packages ?? []);
    const discovered = new Set<string>();

    for (const pattern of patterns) {
        const glob = new Bun.Glob(`${pattern.replace(/\/$/, "")}/package.json`);

        for await (const match of glob.scan({
            cwd: worktreePath,
            onlyFiles: true,
        })) {
            const packagePath = path.dirname(match);

            if (
                packagePath !== "." &&
                !packagePath.startsWith("..") &&
                !packagePath.includes("node_modules")
            ) {
                discovered.add(packagePath);
            }
        }
    }

    return [...discovered].sort((left, right) => left.localeCompare(right));
}

export async function detectPackageManager(
    worktreePath: string,
    manifest: PackageManifest,
): Promise<PackageManager> {
    const declared = manifest.packageManager?.split("@", 1)[0];

    if (
        declared === "bun" ||
        declared === "npm" ||
        declared === "pnpm" ||
        declared === "yarn"
    ) {
        return declared;
    }

    const lockfiles: [string, PackageManager][] = [
        ["bun.lock", "bun"],
        ["bun.lockb", "bun"],
        ["pnpm-lock.yaml", "pnpm"],
        ["yarn.lock", "yarn"],
        ["package-lock.json", "npm"],
    ];

    for (const [fileName, manager] of lockfiles) {
        const [error] = await tryPromise(
            access(path.join(worktreePath, fileName)),
        );

        if (!error) {
            return manager;
        }
    }

    return "npm";
}

export function rankQuickScripts(packages: PackageScriptGroup[]) {
    const rootScripts =
        packages.find((group) => group.path === ".")?.scripts ?? [];
    const ranked = QUICK_SCRIPT_PRIORITY.flatMap((name) => {
        const script = rootScripts.find((item) => item.name === name);
        return script ? [script] : [];
    });
    const selected = new Set(ranked.map((script) => script.name));

    for (const script of rootScripts) {
        if (ranked.length >= 6) {
            break;
        }

        if (!selected.has(script.name)) {
            ranked.push(script);
            selected.add(script.name);
        }
    }

    return ranked.slice(0, 6);
}

function shellQuote(value: string) {
    return `'${value.replaceAll("'", `'\\''`)}'`;
}

function windowsQuote(value: string) {
    return `"${value.replaceAll('"', '\\"')}"`;
}

export function buildPackageScriptCommand(
    manager: PackageManager,
    worktreePath: string,
    script: Pick<PackageScriptInfo, "name" | "packagePath">,
    platform: NodeJS.Platform,
) {
    const packageDirectory = path.resolve(worktreePath, script.packagePath);
    const quote = platform === "win32" ? windowsQuote : shellQuote;
    const runCommand = `${manager} run ${quote(script.name)}`;

    return platform === "win32"
        ? `cd /d ${windowsQuote(packageDirectory)} && ${runCommand}`
        : `cd ${shellQuote(packageDirectory)} && ${runCommand}`;
}
