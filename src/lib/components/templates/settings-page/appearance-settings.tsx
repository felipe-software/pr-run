import {
    Select,
    SelectContent,
    SelectOption,
    SelectTrigger,
} from "@/lib/components/ui/select";
import type { ReactNode } from "react";
import { useUiPreferencesStore } from "@/lib/hooks/store/use-ui-preferences-store";

export function AppearanceSettings() {
    const theme = useUiPreferencesStore((store) => store.theme);
    const setTheme = useUiPreferencesStore((store) => store.setTheme);

    return (
        <SettingsSection
            description="Choose whether PR Run follows your operating system or uses a fixed theme."
            title="Appearance"
        >
            <label className="grid max-w-sm gap-2 text-sm font-medium">
                Theme
                <Select
                    value={theme}
                    onValueChange={(value) =>
                        setTheme(value as "system" | "dark" | "light")
                    }
                >
                    <SelectTrigger />
                    <SelectContent>
                        <SelectOption value="system">System</SelectOption>
                        <SelectOption value="dark">Dark</SelectOption>
                        <SelectOption value="light">Light</SelectOption>
                    </SelectContent>
                </Select>
            </label>
        </SettingsSection>
    );
}

export function SettingsSection({
    children,
    description,
    title,
}: {
    children: ReactNode;
    description: string;
    title: string;
}) {
    return (
        <div className="max-w-3xl space-y-5">
            <div>
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                    {description}
                </p>
            </div>
            {children}
        </div>
    );
}
