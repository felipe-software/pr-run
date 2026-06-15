import { Card } from "@heroui/react";
import { Code2 } from "lucide-react";

export function BranchEmptyState() {
    return (
        <main className="flex h-screen min-h-0 flex-1 items-center justify-center overflow-y-auto bg-background p-8">
            <Card className="max-w-md rounded-lg text-center">
                <Card.Content className="p-8">
                    <Code2 className="mx-auto h-8 w-8 text-muted-foreground" />
                    <Card.Title className="mt-4">Select a branch</Card.Title>
                    <Card.Description>
                        Pick a project in the sidebar and choose a remote branch
                        to inspect commits, scripts, and diffs.
                    </Card.Description>
                </Card.Content>
            </Card>
        </main>
    );
}
