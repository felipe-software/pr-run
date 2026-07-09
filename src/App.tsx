import { useEffect } from "react";

import { PrRunApp } from "@/lib/components/templates/pr-run-app";
import { syncWindowControlsOverlayClass } from "@/lib/window-controls-overlay";

function App() {
    useEffect(() => syncWindowControlsOverlayClass(), []);

    return <PrRunApp />;
}

export default App;
