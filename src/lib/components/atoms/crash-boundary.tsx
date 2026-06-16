import { Component, type ErrorInfo, type ReactNode } from "react";

import { Surface } from "@/lib/components/atoms/surface";

type CrashBoundaryProps = {
    children: ReactNode;
};

type CrashBoundaryState = {
    error: Error | null;
};

export class CrashBoundary extends Component<
    CrashBoundaryProps,
    CrashBoundaryState
> {
    state: CrashBoundaryState = {
        error: null,
    };

    static getDerivedStateFromError(error: Error): CrashBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Renderer crashed", error, errorInfo);
    }

    render() {
        if (!this.state.error) {
            return this.props.children;
        }

        return (
            <main className="fixed inset-0 grid place-items-center bg-background p-8 font-sans text-foreground">
                <Surface className="w-full max-w-3xl px-5 py-4">
                    <h1 className="mb-3 text-lg font-semibold">
                        Renderer crash
                    </h1>
                    <p className="mb-4 text-muted-foreground">
                        Check the Electron terminal output for the full stack
                        trace.
                    </p>
                    <pre className="m-0 whitespace-pre-wrap break-words font-mono text-sm">
                        {this.state.error.stack ?? this.state.error.message}
                    </pre>
                </Surface>
            </main>
        );
    }
}
