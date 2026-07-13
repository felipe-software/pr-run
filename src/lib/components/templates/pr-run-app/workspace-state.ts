import { useCallback, useEffect, useMemo, useRef } from "react";

import type { SettingsSection } from "@/lib/components/templates/pr-run-app/types";
import { usePreloadProjects } from "@/lib/hooks/query/use-preload-projects";
import {
    useWorkspaceNavigationStore,
    workspaceViewFromRoute,
    type WorkspaceView,
} from "@/lib/hooks/store/use-workspace-navigation-store";
import {
    getWorktreeTabId,
    useWorkspaceTabsStore,
} from "@/lib/hooks/store/use-workspace-tabs-store";
import { navigateToAppRoute, readAppRoute } from "@/lib/navigation";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

import type { SelectedBranchView } from "@/lib/components/templates/pr-run-app/types";

type WorkspaceStateOptions = {
    isProjectListReady: boolean;
    projects: ProjectConfig[];
};

type ContentWorkspaceView = Exclude<WorkspaceView, { type: "settings" }>;

export function useWorkspaceState({
    isProjectListReady,
    projects,
}: WorkspaceStateOptions) {
    const workspaceView = useWorkspaceNavigationStore(
        (state) => state.workspaceView,
    );
    const lastContentViewRef = useRef<ContentWorkspaceView>(
        workspaceView.type === "settings"
            ? { type: "overview" }
            : workspaceView,
    );
    const restoredTabIdsRef = useRef<Set<string> | null>(null);

    if (restoredTabIdsRef.current === null) {
        restoredTabIdsRef.current = new Set(
            useWorkspaceTabsStore.getState().tabs.map((tab) => tab.id),
        );
    }

    const restoredTabIds = restoredTabIdsRef.current;
    const restoredProjectBranchesRef = useRef(new Map<string, BranchInfo[]>());
    const selectedProjectId =
        workspaceView.type === "branch" ? workspaceView.projectId : null;
    const selectedProject = useMemo(
        () =>
            projects.find((project) => project.id === selectedProjectId) ??
            null,
        [projects, selectedProjectId],
    );
    const selectedBranchView: SelectedBranchView = {
        branchName:
            workspaceView.type === "branch" ? workspaceView.branchName : null,
        project: selectedProject,
    };
    const transitionToBranch = useCallback(
        (projectId: string, branchName: string) => {
            const nextView: ContentWorkspaceView = {
                branchName,
                projectId,
                type: "branch",
            };

            lastContentViewRef.current = nextView;
            useWorkspaceNavigationStore
                .getState()
                .openBranch(projectId, branchName);
            synchronizeActiveWorkspaceTab(nextView);
            navigateToAppRoute({ branchName, projectId, type: "branch" });
        },
        [],
    );
    const transitionToOverview = useCallback(
        (projectId?: string, replace = false) => {
            const nextView: ContentWorkspaceView = {
                projectId,
                type: "overview",
            };

            lastContentViewRef.current = nextView;
            useWorkspaceNavigationStore.getState().openOverview(projectId);
            navigateToAppRoute({ projectId, type: "overview" }, replace);
        },
        [],
    );

    usePreloadProjects(projects, (projectId, branches) => {
        restoredProjectBranchesRef.current.set(projectId, branches);
        const tabStore = useWorkspaceTabsStore.getState();
        const validTabIds = new Set<string>();

        for (const tab of tabStore.tabs) {
            if (!restoredTabIds.has(tab.id)) {
                validTabIds.add(tab.id);
                continue;
            }

            const projectBranches = restoredProjectBranchesRef.current.get(
                tab.projectId,
            );

            if (
                !projectBranches ||
                projectBranches.some(
                    (branch) =>
                        branch.name === tab.branchName && branch.hasWorktree,
                )
            ) {
                validTabIds.add(tab.id);
            }
        }
        const selectedContentView =
            workspaceView.type === "settings"
                ? lastContentViewRef.current
                : workspaceView;
        const selectedTabId =
            selectedContentView.type === "branch"
                ? getWorktreeTabId(
                      selectedContentView.projectId,
                      selectedContentView.branchName,
                  )
                : null;

        tabStore.pruneTabs(validTabIds);

        if (
            selectedTabId &&
            restoredTabIds.has(selectedTabId) &&
            !validTabIds.has(selectedTabId)
        ) {
            if (workspaceView.type === "settings") {
                lastContentViewRef.current = { type: "overview" };
                return;
            }

            transitionToOverview(undefined, true);
        }
    });

    useEffect(() => {
        function hydrateFromLocation() {
            const route = readAppRoute();
            const nextView = workspaceViewFromRoute(route);
            const currentView =
                useWorkspaceNavigationStore.getState().workspaceView;

            if (
                nextView.type === "settings" &&
                currentView.type !== "settings"
            ) {
                lastContentViewRef.current = currentView;
            } else if (nextView.type !== "settings") {
                lastContentViewRef.current = nextView;
            }

            useWorkspaceNavigationStore.getState().hydrateFromHistory(route);
            synchronizeActiveWorkspaceTab(nextView);
        }

        hydrateFromLocation();
        window.addEventListener("popstate", hydrateFromLocation);
        return () =>
            window.removeEventListener("popstate", hydrateFromLocation);
    }, []);

    useEffect(() => {
        synchronizeActiveWorkspaceTab(workspaceView);
    }, [workspaceView]);

    useEffect(() => {
        if (
            !isProjectListReady ||
            workspaceView.type !== "branch" ||
            selectedProject
        ) {
            return;
        }

        transitionToOverview(undefined, true);
    }, [
        isProjectListReady,
        selectedProject,
        transitionToOverview,
        workspaceView,
    ]);

    function selectBranch(project: ProjectConfig, branch: BranchInfo) {
        if (branch.hasWorktree) {
            useWorkspaceTabsStore.getState().openTab({
                branchName: branch.name,
                projectId: project.id,
                projectName: project.name,
            });
        }

        transitionToBranch(project.id, branch.name);
    }

    function openCreatedWorktree(projectId: string, branchName: string) {
        const project = projects.find((item) => item.id === projectId);

        if (!project) {
            return;
        }

        useWorkspaceTabsStore.getState().openTab({
            branchName,
            projectId,
            projectName: project.name,
        });
        transitionToBranch(projectId, branchName);
    }

    function openSettings(section: SettingsSection = "general") {
        const currentView =
            useWorkspaceNavigationStore.getState().workspaceView;

        if (currentView.type !== "settings") {
            lastContentViewRef.current = currentView;
        }

        useWorkspaceNavigationStore.getState().openSettings(section);
        navigateToAppRoute({ section, type: "settings" });
    }

    function closeSettings() {
        const returnView = lastContentViewRef.current;

        if (returnView.type === "branch") {
            transitionToBranch(returnView.projectId, returnView.branchName);
            return;
        }

        transitionToOverview(returnView.projectId);
    }

    function selectWorktreeTab(tabId: string) {
        const tabStore = useWorkspaceTabsStore.getState();
        const tab = tabStore.tabs.find((item) => item.id === tabId);

        if (!tab) {
            return;
        }

        tabStore.activateTab(tabId);
        transitionToBranch(tab.projectId, tab.branchName);
    }

    function closeWorktreeTab(tabId: string) {
        const selectedContentView =
            workspaceView.type === "settings"
                ? lastContentViewRef.current
                : workspaceView;
        const wasSelected =
            selectedContentView.type === "branch" &&
            getWorktreeTabId(
                selectedContentView.projectId,
                selectedContentView.branchName,
            ) === tabId;
        const tabStore = useWorkspaceTabsStore.getState();

        tabStore.closeTab(tabId);

        if (!wasSelected) {
            return;
        }

        const nextTabId = useWorkspaceTabsStore.getState().activeTabId;
        const nextTab = useWorkspaceTabsStore
            .getState()
            .tabs.find((tab) => tab.id === nextTabId);

        const nextView: ContentWorkspaceView = nextTab
            ? {
                  branchName: nextTab.branchName,
                  projectId: nextTab.projectId,
                  type: "branch",
              }
            : { type: "overview" };

        if (workspaceView.type === "settings") {
            lastContentViewRef.current = nextView;
            return;
        }

        if (nextView.type === "branch") {
            transitionToBranch(nextView.projectId, nextView.branchName);
            return;
        }

        transitionToOverview();
    }

    return {
        closeSettings,
        closeWorktreeTab,
        openCreatedWorktree,
        openOverview: transitionToOverview,
        openSettings,
        selectBranch,
        selectedBranchView,
        selectWorktreeTab,
        setSettingsSection: openSettings,
        workspaceView,
    };
}

function synchronizeActiveWorkspaceTab(workspaceView: WorkspaceView) {
    if (workspaceView.type !== "branch") {
        return;
    }

    const tabStore = useWorkspaceTabsStore.getState();
    const tabId = getWorktreeTabId(
        workspaceView.projectId,
        workspaceView.branchName,
    );

    if (tabStore.tabs.some((tab) => tab.id === tabId)) {
        tabStore.activateTab(tabId);
    }
}
