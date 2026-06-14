import { FilePlus2, KeyRound, Moon, Plus, SunMedium } from "lucide-react";

import { Button } from "@/lib/components/atoms/button";

type SidebarHeaderProps = {
    isCreatingScript: boolean;
    theme: "dark" | "light";
    onAddProject: () => void;
    onCreateScript: () => void;
    onOpenSshPassphrase: () => void;
    onToggleTheme: () => void;
};

export function SidebarHeader({
    isCreatingScript,
    theme,
    onAddProject,
    onCreateScript,
    onOpenSshPassphrase,
    onToggleTheme,
}: SidebarHeaderProps) {
    return (
        <header className="flex items-center justify-between px-3 py-3">
            <div className="min-w-0">
                <div className="truncate text-[15px] font-semibold tracking-[-0.02em]">
                    PR Run
                </div>
            </div>
            <div className="flex gap-2">
                <Button
                    aria-label="Toggle theme"
                    className="h-8 min-w-8 px-2 text-[11px]"
                    isIconOnly
                    type="button"
                    onPress={onToggleTheme}
                >
                    {theme === "dark" ? (
                        <SunMedium className="h-4 w-4" />
                    ) : (
                        <Moon className="h-4 w-4" />
                    )}
                </Button>
                <Button
                    aria-label="Create script"
                    className="h-8 min-w-8 px-2 text-[11px]"
                    isDisabled={isCreatingScript}
                    isIconOnly
                    type="button"
                    onPress={onCreateScript}
                >
                    <FilePlus2 className="h-4 w-4" />
                </Button>
                <Button
                    aria-label="SSH passphrase"
                    className="h-8 min-w-8 px-2 text-[11px]"
                    isIconOnly
                    type="button"
                    onPress={onOpenSshPassphrase}
                >
                    <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                    aria-label="Add project"
                    className="h-8 w-8"
                    isIconOnly
                    type="button"
                    onPress={onAddProject}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        </header>
    );
}
