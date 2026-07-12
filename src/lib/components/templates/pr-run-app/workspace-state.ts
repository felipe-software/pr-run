import { useEffect, useMemo, useRef, useState } from "react";

import { usePreloadProjects } from "@/lib/hooks/query/use-preload-projects";
import {
    getWorktreeTabId,
    useWorkspaceTabsStore,
} from "@/lib/hooks/store/use-workspace-tabs-store";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";
import { navigateToAppRoute, readAppRoute } from "@/lib/navigation";

import type {
    SelectedBranchState,
    SelectedBranchView,
} from "@/lib/components/templates/pr-run-app/types";

type WorkspaceStateOptions = {
    onLeaveSettings: () => void;
    projects: ProjectConfig[];
};

export function useWorkspaceState({
    onLeaveSettings,
    projects,
}: WorkspaceStateOptions) {
    const initialRouteRef = useRef(readAppRoute());
    const [selectedBranch, setSelectedBranch] =
        useState<SelectedBranchState | null>(() => {
            const route = initialRouteRef.current;

            return route.type === "branch"
                ? {
                      branchName: route.branchName,
                      projectId: route.projectId,
                  }
                : null;
        });
    const [isOverviewOpen, setIsOverviewOpen] = useState(
        () => initialRouteRef.current.type !== "branch",
    );
    const [overviewProjectId, setOverviewProjectId] = useState<
        string | undefined
    >(() =>
        initialRouteRef.current.type === "overview"
            ? initialRouteRef.current.projectId
            : undefined,
    );
    const restoredTabIdsRef = useRef(
        new Set(useWorkspaceTabsStore.getState().tabs.map((tab) => tab.id)),
    );
    const restoredProjectBranchesRef = useRef(new Map<string, BranchInfo[]>());
    const selectedProject = useMemo(
        () =>
            projects.find(
                (project) => project.id === selectedBranch?.projectId,
            ) ?? null,
        [projects, selectedBranch?.projectId],
    );
    const selectedBranchView: SelectedBranchView = {
        branchName: selectedBranch?.branchName ?? null,
        project: selectedProject,
    };

    usePreloadProjects(projects, (projectId, branches) => {
        restoredProjectBranchesRef.current.set(projectId, branches);
        const store = useWorkspaceTabsStore.getState();
        const validTabIds = new Set(
            store.tabs
                .filter((tab) => {
                    if (!restoredTabIdsRef.current.has(tab.id)) {
                        return true;
                    }

                    const projectBranches =
                        restoredProjectBranchesRef.current.get(tab.projectId);

                    if (!projectBranches) {
                        return true;
                    }

                    return projectBranches.some(
                        (branch) =>
                            branch.name === tab.branchName &&
                            branch.hasWorktree,
                    );
                })
                .map((tab) => tab.id),
        );
        const selectedTabId = selectedBranch
            ? getWorktreeTabId(
                  selectedBranch.projectId,
                  selectedBranch.branchName,
              )
            : null;

        store.pruneTabs(validTabIds);

        if (
            selectedTabId &&
            restoredTabIdsRef.current.has(selectedTabId) &&
            !validTabIds.has(selectedTabId)
        ) {
            setSelectedBranch(null);
            setIsOverviewOpen(true);
        }
    });

    useEffect(() => {
        function handlePopState() {
            const route = readAppRoute();

            if (route.type === "branch") {
                setSelectedBranch({
                    branchName: route.branchName,
                    projectId: route.projectId,
                });
                setIsOverviewOpen(false);
                return;
            }

            if (route.type === "overview") {
                setOverviewProjectId(route.projectId);
                setIsOverviewOpen(true);
            }
        }

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    useEffect(() => {
        if (!selectedBranch || selectedProject || projects.length === 0) {
            return;
        }

        setSelectedBranch(null);
        setIsOverviewOpen(true);
        navigateToAppRoute({ type: "overview" }, true);
    }, [selectedBranch, selectedProject]);

    function selectBranch(project: ProjectConfig, branch: BranchInfo) {
        onLeaveSettings();
        navigateToAppRoute({
            branchName: branch.name,
            projectId: project.id,
            type: "branch",
        });
        setSelectedBranch({
            branchName: branch.name,
            projectId: project.id,
        });
        setIsOverviewOpen(false);

        if (branch.hasWorktree) {
            useWorkspaceTabsStore.getState().openTab({
                branchName: branch.name,
                projectId: project.id,
                projectName: project.name,
            });
        }
    }

    function openCreatedWorktree(projectId: string, branchName: string) {
        const project = projects.find((item) => item.id === projectId);

        if (!project) {
            return;
        }

        onLeaveSettings();
        navigateToAppRoute({ branchName, projectId, type: "branch" });
        useWorkspaceTabsStore.getState().openTab({
            branchName,
            projectId,
            projectName: project.name,
        });
        setSelectedBranch({ branchName, projectId });
        setIsOverviewOpen(false);
    }

    function openOverview(projectId?: string) {
        onLeaveSettings();
        navigateToAppRoute({ projectId, type: "overview" });
        setOverviewProjectId(projectId);
        setIsOverviewOpen(true);
    }

    function selectWorktreeTab(tabId: string) {
        const tab = useWorkspaceTabsStore
            .getState()
            .tabs.find((item) => item.id === tabId);

        if (!tab) {
            return;
        }

        useWorkspaceTabsStore.getState().activateTab(tabId);
        onLeaveSettings();
        navigateToAppRoute({
            branchName: tab.branchName,
            projectId: tab.projectId,
            type: "branch",
        });
        setSelectedBranch({
            branchName: tab.branchName,
            projectId: tab.projectId,
        });
        setIsOverviewOpen(false);
    }

    function closeWorktreeTab(tabId: string) {
        const wasSelected =
            selectedBranch !== null &&
            getWorktreeTabId(
                selectedBranch.projectId,
                selectedBranch.branchName,
            ) === tabId;
        useWorkspaceTabsStore.getState().closeTab(tabId);

        if (!wasSelected) {
            return;
        }

        const nextTabId = useWorkspaceTabsStore.getState().activeTabId;
        const nextTab = useWorkspaceTabsStore
            .getState()
            .tabs.find((tab) => tab.id === nextTabId);

        if (!nextTab) {
            setSelectedBranch(null);
            setIsOverviewOpen(true);
            navigateToAppRoute({ type: "overview" });
            return;
        }

        setSelectedBranch({
            branchName: nextTab.branchName,
            projectId: nextTab.projectId,
        });
        setIsOverviewOpen(false);
        navigateToAppRoute({
            branchName: nextTab.branchName,
            projectId: nextTab.projectId,
            type: "branch",
        });
    }

    return {
        closeWorktreeTab,
        isOverviewOpen,
        openCreatedWorktree,
        openOverview,
        overviewProjectId,
        selectBranch,
        selectedBranch,
        selectedBranchView,
        selectWorktreeTab,
    };
}
