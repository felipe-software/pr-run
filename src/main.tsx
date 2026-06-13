import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";

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
