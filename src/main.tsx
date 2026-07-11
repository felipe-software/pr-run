import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/dm-sans/index.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@xterm/xterm/css/xterm.css";
import App from "@/App";
import { CrashBoundary } from "@/lib/components/atoms/crash-boundary";
import { ToastViewport } from "@/lib/components/ui/toast";
import { queryClient } from "@/lib/query-client";
import {
    QUERY_CACHE_BUSTER,
    QUERY_CACHE_MAX_AGE,
    queryCachePersister,
    shouldDehydratePrRunQuery,
} from "@/lib/query-cache-persistence";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
            buster: QUERY_CACHE_BUSTER,
            dehydrateOptions: {
                shouldDehydrateMutation: () => false,
                shouldDehydrateQuery: shouldDehydratePrRunQuery,
            },
            maxAge: QUERY_CACHE_MAX_AGE,
            persister: queryCachePersister,
        }}
    >
        <CrashBoundary>
            <App />
            <ToastViewport />
        </CrashBoundary>
    </PersistQueryClientProvider>,
);
