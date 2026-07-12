import {
    Activity,
    FolderGit2,
    Keyboard,
    KeyRound,
    Palette,
    ScrollText,
    Settings,
} from "lucide-react";
import type { ElementType } from "react";

import { Button } from "@/lib/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { SettingsSection } from "@/lib/components/templates/pr-run-app/types";

const sections: Array<{
    icon: ElementType;
    id: SettingsSection;
    label: string;
}> = [
    { icon: Settings, id: "general", label: "General" },
    { icon: Palette, id: "appearance", label: "Appearance" },
    { icon: Keyboard, id: "hotkeys", label: "Hotkeys" },
    { icon: FolderGit2, id: "projects", label: "Projects" },
    { icon: ScrollText, id: "scripts", label: "Scripts" },
    { icon: KeyRound, id: "ssh", label: "SSH" },
    { icon: Activity, id: "diagnostics", label: "Diagnostics" },
];

export function SettingsSidebarNav({
    section,
    onSelect,
}: {
    onSelect: (section: SettingsSection) => void;
    section: SettingsSection;
}) {
    return (
        <nav
            aria-label="Settings sections"
            className="flex gap-1 overflow-x-auto border-b p-2 md:w-44
                md:flex-col md:border-r md:border-b-0"
        >
            {sections.map(({ icon: Icon, id, label }) => (
                <Button
                    className={cn(
                        "justify-start",
                        section === id && "bg-accent",
                    )}
                    key={id}
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelect(id)}
                >
                    <Icon className="size-3.5" />
                    {label}
                </Button>
            ))}
        </nav>
    );
}
