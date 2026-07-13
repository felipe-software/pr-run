import { contextBridge, ipcRenderer } from "electron";

let backendUrlPromise: Promise<string> | null = null;

function getBackendUrl() {
    backendUrlPromise ??= ipcRenderer.invoke(
        "backend:getUrl",
    ) as Promise<string>;
    return backendUrlPromise;
}

contextBridge.exposeInMainWorld("prRun", {
    platform: process.platform,
    getBackendUrl,
    setTitleBarTheme(theme: "dark" | "light") {
        return ipcRenderer.invoke(
            "window:setTitleBarTheme",
            theme,
        ) as Promise<void>;
    },
});
