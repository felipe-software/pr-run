import { useState } from "react";

import type {
    SettingsSection,
    WorkspaceView,
} from "@/lib/components/templates/pr-run-app/types";

export function useSettingsState() {
    const [workspaceView, setWorkspaceView] = useState<WorkspaceView>({
        type: "branch",
    });

    return {
        closeSettings: () => setWorkspaceView({ type: "branch" }),
        openSettings: (section: SettingsSection = "general") =>
            setWorkspaceView({ section, type: "settings" }),
        setSettingsSection: (section: SettingsSection) =>
            setWorkspaceView({ section, type: "settings" }),
        workspaceView,
    };
}
