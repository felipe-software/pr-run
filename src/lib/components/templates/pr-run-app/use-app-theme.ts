import { useEffect } from "react";

import { tryPromise } from "@/lib/error";
import { useUiPreferencesStore } from "@/lib/hooks/store/use-ui-preferences-store";

export function useAppTheme() {
    const theme = useUiPreferencesStore((store) => store.theme);
    const setTheme = useUiPreferencesStore((store) => store.setTheme);

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const applyTheme = () => {
            const resolved =
                theme === "system" ? (media.matches ? "dark" : "light") : theme;
            const root = document.documentElement;

            root.classList.add("no-transitions");
            root.dataset.theme = resolved;
            root.classList.toggle("dark", resolved === "dark");
            root.style.colorScheme = resolved;
            syncTitleBarTheme(resolved);
            window.setTimeout(() => root.classList.remove("no-transitions"), 0);
        };

        applyTheme();
        media.addEventListener("change", applyTheme);
        return () => media.removeEventListener("change", applyTheme);
    }, [theme]);

    return { setTheme, theme };
}

async function syncTitleBarTheme(theme: "dark" | "light") {
    if (!window.prRun) {
        return;
    }

    const [error] = await tryPromise(window.prRun.setTitleBarTheme(theme));

    if (error) {
        console.error("Failed to update the title bar theme.", error);
    }
}
