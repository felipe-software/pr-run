import {
    Select,
    SelectContent,
    SelectOption,
    SelectTrigger,
} from "@/lib/components/ui/select";
import type { ReactNode } from "react";
import {
    type DateFormatPreference,
    useUiPreferencesStore,
} from "@/lib/hooks/store/use-ui-preferences-store";

const themeItems = [
    { label: "System", value: "system" },
    { label: "Dark", value: "dark" },
    { label: "Light", value: "light" },
];

const dateFormatItems = [
    { label: "31/12/2026", value: "dd/mm/yyyy" },
    { label: "12/31/2026", value: "mm/dd/yyyy" },
    { label: "12-31-2026", value: "mm-dd-yyyy" },
    { label: "2026-12-31", value: "yyyy-mm-dd" },
];

export function AppearanceSettings() {
    const theme = useUiPreferencesStore((store) => store.theme);
    const setTheme = useUiPreferencesStore((store) => store.setTheme);
    const dateFormat = useUiPreferencesStore((store) => store.dateFormat);
    const setDateFormat = useUiPreferencesStore((store) => store.setDateFormat);

    return (
        <SettingsSection
            description="Choose the workspace theme and how absolute dates are displayed."
            title="Appearance"
        >
            <div className="flex max-w-sm flex-col gap-4">
                <label className="flex flex-col gap-2 text-sm font-medium">
                    Theme
                    <Select
                        items={themeItems}
                        value={theme}
                        onValueChange={(value) =>
                            setTheme(value as "system" | "dark" | "light")
                        }
                    >
                        <SelectTrigger />
                        <SelectContent>
                            {themeItems.map((item) => (
                                <SelectOption
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </SelectOption>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium">
                    Date format
                    <Select
                        items={dateFormatItems}
                        value={dateFormat}
                        onValueChange={(value) =>
                            setDateFormat(value as DateFormatPreference)
                        }
                    >
                        <SelectTrigger />
                        <SelectContent>
                            {dateFormatItems.map((item) => (
                                <SelectOption
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.label}
                                </SelectOption>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
            </div>
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
