import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/dm-sans/index.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@xterm/xterm/css/xterm.css";
import App from "@/App";
import { CrashBoundary } from "@/lib/components/atoms/crash-boundary";
import { queryClient } from "@/lib/query-client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
        <CrashBoundary>
            <App />
        </CrashBoundary>
    </QueryClientProvider>,
);
