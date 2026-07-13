import { beforeEach, describe, expect, test } from "vitest";

import { useWorkspaceNavigationStore } from "@/lib/hooks/store/use-workspace-navigation-store";

describe("workspace navigation state", () => {
    beforeEach(() => {
        useWorkspaceNavigationStore.setState({
            workspaceView: { type: "overview" },
        });
    });

    test("opens global and project overviews", () => {
        const store = useWorkspaceNavigationStore.getState();

        store.openOverview("project-1");
        expect(useWorkspaceNavigationStore.getState().workspaceView).toEqual({
            projectId: "project-1",
            type: "overview",
        });

        store.openOverview();
        expect(useWorkspaceNavigationStore.getState().workspaceView).toEqual({
            projectId: undefined,
            type: "overview",
        });
    });

    test("opens one branch view", () => {
        useWorkspaceNavigationStore
            .getState()
            .openBranch("project-1", "feature/navigation");

        expect(useWorkspaceNavigationStore.getState().workspaceView).toEqual({
            branchName: "feature/navigation",
            projectId: "project-1",
            type: "branch",
        });
    });

    test("opens and changes settings sections", () => {
        const store = useWorkspaceNavigationStore.getState();

        store.openSettings("general");
        expect(useWorkspaceNavigationStore.getState().workspaceView).toEqual({
            section: "general",
            type: "settings",
        });

        store.openSettings("ssh");
        expect(useWorkspaceNavigationStore.getState().workspaceView).toEqual({
            section: "ssh",
            type: "settings",
        });
    });

    test("hydrates each view from browser history routes", () => {
        const store = useWorkspaceNavigationStore.getState();

        store.hydrateFromHistory({
            branchName: "feature/history",
            page: "changes",
            projectId: "project-2",
            type: "branch",
        });
        expect(useWorkspaceNavigationStore.getState().workspaceView).toEqual({
            branchName: "feature/history",
            projectId: "project-2",
            type: "branch",
        });

        store.hydrateFromHistory({ projectId: "project-3", type: "overview" });
        expect(useWorkspaceNavigationStore.getState().workspaceView).toEqual({
            projectId: "project-3",
            type: "overview",
        });

        store.hydrateFromHistory({ section: "projects", type: "settings" });
        expect(useWorkspaceNavigationStore.getState().workspaceView).toEqual({
            section: "projects",
            type: "settings",
        });
    });
});
