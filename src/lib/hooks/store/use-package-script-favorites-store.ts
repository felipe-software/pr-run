import { create } from "zustand";

import { tryPromise } from "@/lib/error";
import type { PackageScriptInfo } from "@/types/pr-run";

const STORAGE_KEY = "pr-run:package-script-favorites";
const EMPTY_FAVORITE_KEYS: string[] = [];

type PackageScriptFavoritesState = {
    favoriteKeysByProject: Record<string, string[]>;
    toggleFavorite: (projectId: string, script: PackageScriptInfo) => void;
};

export function getPackageScriptKey(
    script: Pick<PackageScriptInfo, "name" | "packagePath">,
) {
    return `${script.packagePath}\u0000${script.name}`;
}

export function togglePackageScriptFavorite(keys: string[], scriptKey: string) {
    return keys.includes(scriptKey)
        ? keys.filter((key) => key !== scriptKey)
        : [...keys, scriptKey];
}

export function getProjectFavoriteKeys(
    favoriteKeysByProject: Record<string, string[]>,
    projectId: string,
) {
    return favoriteKeysByProject[projectId] ?? EMPTY_FAVORITE_KEYS;
}

function readStoredFavorites() {
    if (typeof localStorage === "undefined") {
        return null;
    }

    return localStorage.getItem(STORAGE_KEY);
}

function normalizeFavorites(value: unknown): Record<string, string[]> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value).flatMap(([projectId, keys]) =>
            Array.isArray(keys) &&
            keys.every((item) => typeof item === "string")
                ? [[projectId, keys]]
                : [],
        ),
    );
}

function persistFavorites(value: Record<string, string[]>) {
    if (typeof localStorage === "undefined") {
        return;
    }

    tryPromise(
        Promise.resolve().then(() =>
            localStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
        ),
    );
}

export const usePackageScriptFavoritesStore =
    create<PackageScriptFavoritesState>((set) => ({
        favoriteKeysByProject: {},
        toggleFavorite: (projectId, script) =>
            set((state) => {
                const projectKeys =
                    state.favoriteKeysByProject[projectId] ?? [];
                const next = {
                    ...state.favoriteKeysByProject,
                    [projectId]: togglePackageScriptFavorite(
                        projectKeys,
                        getPackageScriptKey(script),
                    ),
                };

                persistFavorites(next);
                return { favoriteKeysByProject: next };
            }),
    }));

async function hydrateFavorites() {
    const stored = readStoredFavorites();

    if (!stored) {
        return;
    }

    const [error, parsed] = await tryPromise(
        Promise.resolve().then(() => JSON.parse(stored) as unknown),
    );

    if (!error) {
        usePackageScriptFavoritesStore.setState({
            favoriteKeysByProject: normalizeFavorites(parsed),
        });
    }
}

hydrateFavorites();
