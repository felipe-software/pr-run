declare global {
    interface Window {
        prRun?: {
            getBackendUrl(): Promise<string>;
            platform: string;
            setTitleBarTheme(theme: "dark" | "light"): Promise<void>;
        };
    }
}

export {};
