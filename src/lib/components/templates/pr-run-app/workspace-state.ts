import { useEffect, useMemo, useRef, useState } from "react";

import { usePreloadProjects } from "@/lib/hooks/query/use-preload-projects";
import {
    getWorktreeTabId,
    useWorkspaceTabsStore,
} from "@/lib/hooks/store/use-workspace-tabs-store";
import type { BranchInfo, ProjectConfig } from "@/types/pr-run";

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
    const [selectedBranch, setSelectedBranch] =
        useState<SelectedBranchState | null>(null);
    const [isOverviewOpen, setIsOverviewOpen] = useState(true);
    const workspaceTabs = useWorkspaceTabsStore((store) => store.tabs);
    const activeWorkspaceTabId = useWorkspaceTabsStore(
        (store) => store.activeTabId,
    );
    const hasRestoredWorkspaceRef = useRef(false);
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

        if (selectedTabId && !validTabIds.has(selectedTabId)) {
            setSelectedBranch(null);
            setIsOverviewOpen(true);
        }
    });

    useEffect(() => {
        if (hasRestoredWorkspaceRef.current || projects.length === 0) {
            return;
        }

        hasRestoredWorkspaceRef.current = true;
        const activeTab = workspaceTabs.find(
            (tab) => tab.id === activeWorkspaceTabId,
        );

        if (!activeTab) {
            return;
        }

        const project = projects.find(
            (item) => item.id === activeTab.projectId,
        );

        if (!project) {
            useWorkspaceTabsStore
                .getState()
                .pruneTabs(
                    new Set(
                        workspaceTabs
                            .filter((tab) =>
                                projects.some(
                                    (item) => item.id === tab.projectId,
                                ),
                            )
                            .map((tab) => tab.id),
                    ),
                );
            return;
        }

        setSelectedBranch({
            branchName: activeTab.branchName,
            projectId: activeTab.projectId,
        });
        setIsOverviewOpen(false);
    }, [activeWorkspaceTabId, projects, workspaceTabs]);

    useEffect(() => {
        if (!selectedBranch || selectedProject) {
            return;
        }

        setSelectedBranch(null);
        setIsOverviewOpen(true);
    }, [selectedBranch, selectedProject]);

    function selectBranch(project: ProjectConfig, branch: BranchInfo) {
        onLeaveSettings();
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
        useWorkspaceTabsStore.getState().openTab({
            branchName,
            projectId,
            projectName: project.name,
        });
        setSelectedBranch({ branchName, projectId });
        setIsOverviewOpen(false);
    }

    function openOverview() {
        onLeaveSettings();
        setIsOverviewOpen(true);
        setSelectedBranch(null);
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
            return;
        }

        setSelectedBranch({
            branchName: nextTab.branchName,
            projectId: nextTab.projectId,
        });
        setIsOverviewOpen(false);
    }

    return {
        closeWorktreeTab,
        isOverviewOpen,
        openCreatedWorktree,
        openOverview,
        selectBranch,
        selectedBranch,
        selectedBranchView,
        selectWorktreeTab,
    };
}
