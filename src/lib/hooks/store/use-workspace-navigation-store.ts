import { create } from "zustand";

import type { SettingsSection } from "@/lib/components/templates/pr-run-app/types";
import { readAppRoute, type AppRoute } from "@/lib/navigation";

export type WorkspaceView =
    | { projectId?: string; type: "overview" }
    | { branchName: string; projectId: string; type: "branch" }
    | { section: SettingsSection; type: "settings" };

type WorkspaceNavigationStore = {
    workspaceView: WorkspaceView;
    hydrateFromHistory: (route: AppRoute) => void;
    openBranch: (projectId: string, branchName: string) => void;
    openOverview: (projectId?: string) => void;
    openSettings: (section: SettingsSection) => void;
};

export function workspaceViewFromRoute(route: AppRoute): WorkspaceView {
    if (route.type === "branch") {
        return {
            branchName: route.branchName,
            projectId: route.projectId,
            type: "branch",
        };
    }

    if (route.type === "settings") {
        return { section: route.section, type: "settings" };
    }

    return { projectId: route.projectId, type: "overview" };
}

function readInitialWorkspaceView(): WorkspaceView {
    if (typeof window === "undefined") {
        return { type: "overview" };
    }

    return workspaceViewFromRoute(readAppRoute());
}

export const useWorkspaceNavigationStore = create<WorkspaceNavigationStore>(
    (set) => ({
        workspaceView: readInitialWorkspaceView(),
        hydrateFromHistory: (route) => {
            set({ workspaceView: workspaceViewFromRoute(route) });
        },
        openBranch: (projectId, branchName) => {
            set({ workspaceView: { branchName, projectId, type: "branch" } });
        },
        openOverview: (projectId) => {
            set({ workspaceView: { projectId, type: "overview" } });
        },
        openSettings: (section) => {
            set({ workspaceView: { section, type: "settings" } });
        },
    }),
);
