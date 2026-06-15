import { Component, type ErrorInfo, type ReactNode } from "react";

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
            <main className="fixed inset-0 grid place-items-center bg-background p-8 text-foreground [font-family:'SF_Pro_Display','Geist_Sans','Helvetica_Neue','Avenir_Next','Segoe_UI',sans-serif]">
                <section className="w-full max-w-3xl border border-border bg-surface px-5 py-4">
                    <h1 className="mb-3 text-lg">Renderer crash</h1>
                    <p className="mb-4 text-muted-foreground">
                        Check the Electron terminal output for the full stack
                        trace.
                    </p>
                    <pre className="m-0 whitespace-pre-wrap break-words font-mono text-sm">
                        {this.state.error.stack ?? this.state.error.message}
                    </pre>
                </section>
            </main>
        );
    }
}
