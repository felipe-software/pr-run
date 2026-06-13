import { createRoot } from "react-dom/client";

import "@xterm/xterm/css/xterm.css";
import App from "./App";
import { CrashBoundary } from "./components/CrashBoundary";
import "./index.css";

createRoot(document.getElementById("root")!).render(
    <CrashBoundary>
        <App />
    </CrashBoundary>,
);
