import { useEffect, useState } from "react";

import type {
    SettingsSection,
    WorkspaceView,
} from "@/lib/components/templates/pr-run-app/types";
import { navigateToAppRoute, readAppRoute } from "@/lib/navigation";

export function useSettingsState() {
    const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() => {
        const route = readAppRoute();

        return route.type === "settings"
            ? { section: route.section, type: "settings" }
            : { type: "branch" };
    });

    useEffect(() => {
        function handlePopState() {
            const route = readAppRoute();
            setWorkspaceView(
                route.type === "settings"
                    ? { section: route.section, type: "settings" }
                    : { type: "branch" },
            );
        }

        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, []);

    return {
        closeSettings: () => setWorkspaceView({ type: "branch" }),
        openSettings: (section: SettingsSection = "general") => {
            navigateToAppRoute({ section, type: "settings" });
            setWorkspaceView({ section, type: "settings" });
        },
        setSettingsSection: (section: SettingsSection) => {
            navigateToAppRoute({ section, type: "settings" });
            setWorkspaceView({ section, type: "settings" });
        },
        workspaceView,
    };
}
