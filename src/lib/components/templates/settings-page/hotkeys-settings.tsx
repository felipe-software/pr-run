import {
    formatForDisplay,
    useHotkeyRecorder,
    type Hotkey,
} from "@tanstack/react-hotkeys";

import { SettingsSection } from "@/lib/components/templates/settings-page/appearance-settings";
import { Button } from "@/lib/components/ui/button";
import { Kbd } from "@/lib/components/ui/kbd";
import {
    defaultHotkeys,
    type HotkeyAction,
    useUiPreferencesStore,
} from "@/lib/hooks/store/use-ui-preferences-store";

const actions: Array<{
    description: string;
    id: HotkeyAction;
    label: string;
}> = [
    {
        description: "Show or hide the projects sidebar.",
        id: "closeSidebar",
        label: "Toggle sidebar",
    },
    {
        description: "Move to the next open branch tab.",
        id: "nextTab",
        label: "Next tab",
    },
    {
        description: "Move to the previous open branch tab.",
        id: "previousTab",
        label: "Previous tab",
    },
    {
        description: "Close the active branch tab.",
        id: "closeTab",
        label: "Close tab",
    },
    {
        description:
            "Open the terminal panel, creating a home shell if needed.",
        id: "globalTerminal",
        label: "Open global terminal",
    },
];

export function HotkeysSettings() {
    const resetHotkeys = useUiPreferencesStore((store) => store.resetHotkeys);

    return (
        <SettingsSection
            description="Choose the shortcuts used across the workspace. Press Escape while recording to cancel."
            title="Keyboard shortcuts"
        >
            <div
                className="flex max-w-2xl flex-col overflow-hidden rounded-lg
                    border"
            >
                {actions.map((action) => (
                    <HotkeyRow key={action.id} {...action} />
                ))}
            </div>
            <Button size="sm" variant="outline" onClick={resetHotkeys}>
                Restore defaults
            </Button>
        </SettingsSection>
    );
}

function HotkeyRow({ description, id, label }: (typeof actions)[number]) {
    const hotkey = useUiPreferencesStore((store) => store.hotkeys[id]);
    const hotkeys = useUiPreferencesStore((store) => store.hotkeys);
    const setHotkey = useUiPreferencesStore((store) => store.setHotkey);
    const recorder = useHotkeyRecorder({
        ignoreInputs: false,
        onRecord: (nextHotkey) =>
            setHotkey(id, nextHotkey || defaultHotkeys[id]),
    });
    const displayedHotkey = recorder.recordedHotkey ?? hotkey;
    const conflict = actions.find(
        (action) => action.id !== id && hotkeys[action.id] === hotkey,
    );

    return (
        <div
            className="border-border flex min-h-14 items-center gap-3 border-b
                px-3 py-2 last:border-b-0"
        >
            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-muted-foreground text-xs">
                    {description}
                </div>
                {conflict ? (
                    <div className="text-danger mt-0.5 text-xs">
                        Also assigned to {conflict.label.toLowerCase()}.
                    </div>
                ) : null}
            </div>
            <Button
                aria-label={`Change ${label.toLowerCase()} shortcut`}
                className="min-w-28"
                size="sm"
                variant={recorder.isRecording ? "default" : "outline"}
                onClick={recorder.startRecording}
            >
                {recorder.isRecording ? (
                    "Press keys…"
                ) : (
                    <Kbd>{formatForDisplay(displayedHotkey as Hotkey)}</Kbd>
                )}
            </Button>
            <Button
                disabled={hotkey === defaultHotkeys[id]}
                size="sm"
                variant="ghost"
                onClick={() => setHotkey(id, defaultHotkeys[id])}
            >
                Reset
            </Button>
        </div>
    );
}
