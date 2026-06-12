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
            <main
                style={{
                    minHeight: "100vh",
                    display: "grid",
                    placeItems: "center",
                    padding: "2rem",
                    background: "var(--app-bg, #111111)",
                    color: "var(--app-text, #f5f1e8)",
                    fontFamily:
                        '"SF Pro Display", "Geist Sans", "Helvetica Neue", "Avenir Next", "Segoe UI", sans-serif',
                }}
            >
                <section
                    style={{
                        width: "100%",
                        maxWidth: "44rem",
                        border: "1px solid rgb(255 255 255 / 0.12)",
                        background: "rgb(255 255 255 / 0.04)",
                        padding: "1rem 1.25rem",
                    }}
                >
                    <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.125rem" }}>
                        Renderer crash
                    </h1>
                    <p
                        style={{
                            margin: "0 0 1rem",
                            color: "var(--app-muted, #979289)",
                        }}
                    >
                        Check the Electron terminal output for the full stack
                        trace.
                    </p>
                    <pre
                        style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontFamily: "monospace",
                            fontSize: "0.875rem",
                        }}
                    >
                        {this.state.error.stack ?? this.state.error.message}
                    </pre>
                </section>
            </main>
        );
    }
}
