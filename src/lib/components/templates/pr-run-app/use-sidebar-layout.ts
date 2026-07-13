import { useState } from "react";

import { useUiPreferencesStore } from "@/lib/hooks/store/use-ui-preferences-store";
import { sidebarResize } from "@/lib/components/templates/sidebar/sidebar-resize";

export function useSidebarLayout() {
    const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(
        () => new Set(),
    );
    const storedSidebarWidth = useUiPreferencesStore(
        (store) => store.sidebarWidth,
    );
    const setStoredSidebarWidth = useUiPreferencesStore(
        (store) => store.setSidebarWidth,
    );
    const [sidebarWidth, setSidebarWidth] = useState(() =>
        sidebarResize.clamp(storedSidebarWidth ?? sidebarResize.defaultWidth),
    );

    function resizeSidebar(width: number) {
        const nextWidth = sidebarResize.clamp(width);
        setSidebarWidth(nextWidth);
        setStoredSidebarWidth(nextWidth);
    }

    function toggleProject(projectId: string) {
        setCollapsedProjects((current) => {
            const next = new Set(current);
            next.has(projectId) ? next.delete(projectId) : next.add(projectId);
            return next;
        });
    }

    return {
        collapsedProjects,
        resizeSidebar,
        sidebarWidth,
        toggleProject,
    };
}
