import type { ReactNode } from "react";

import { Button } from "@/lib/components/ui/button";
import { SettingsSidebarNav } from "@/lib/components/templates/settings-page/settings-sidebar-nav";
import type { SettingsSection } from "@/lib/components/templates/pr-run-app/types";

export function SettingsLayout({
    children,
    onClose,
    onSelectSection,
    section,
}: {
    children: ReactNode;
    onClose: () => void;
    onSelectSection: (section: SettingsSection) => void;
    section: SettingsSection;
}) {
    return (
        <section className="flex min-h-0 flex-1 flex-col">
            <header
                className="workspace-topbar drag-region justify-between border-b
                    px-4"
            >
                <div>
                    <h1 className="text-sm font-semibold">Settings</h1>
                    <p className="text-muted-foreground text-xs">
                        Local workspace preferences and diagnostics
                    </p>
                </div>
                <Button variant="outline" onClick={onClose}>
                    Done
                </Button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                <SettingsSidebarNav
                    section={section}
                    onSelect={onSelectSection}
                />
                <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </section>
    );
}
