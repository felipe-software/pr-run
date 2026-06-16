import { Code2 } from "lucide-react";

import { EmptyState } from "@/lib/components/atoms/empty-state";

export function BranchEmptyState() {
    return (
        <main className="flex h-dvh min-h-0 flex-1 overflow-y-auto bg-background">
            <EmptyState
                description="Pick a project in the sidebar and choose a remote branch to inspect commits, scripts, and diffs."
                icon={<Code2 className="h-4 w-4" />}
                title="Select a branch"
            />
        </main>
    );
}
