import { Card, Input, Label, Surface } from "@heroui/react";
import { FilePlus2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/lib/components/atoms/button";

type CreateScriptDialogProps = {
    error?: string;
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (title: string) => Promise<void>;
};

export function CreateScriptDialog({
    error,
    isOpen,
    isSubmitting,
    onClose,
    onSubmit,
}: CreateScriptDialogProps) {
    const [title, setTitle] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setTitle("");
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await onSubmit(title.trim());
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
            <Surface className="w-full max-w-lg rounded-lg border border-border bg-background shadow-xl">
                <form className="p-5" onSubmit={handleSubmit}>
                    <Card.Header className="mb-5 px-0 pt-0">
                        <div className="flex items-start gap-3">
                            <FilePlus2 className="mt-0.5 h-5 w-5 text-primary" />
                            <div>
                                <Card.Title>Create script</Card.Title>
                                <Card.Description>
                                    Create a global TypeScript script available
                                    to every project.
                                </Card.Description>
                            </div>
                        </div>
                    </Card.Header>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="script-title">Title</Label>
                        <Input
                            autoFocus
                            fullWidth
                            id="script-title"
                            placeholder="Run Expo"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                        />
                    </div>

                    {error ? (
                        <Surface className="mt-3 rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">
                            {error}
                        </Surface>
                    ) : null}

                    <div className="mt-6 flex justify-end gap-2">
                        <Button
                            isDisabled={isSubmitting}
                            type="button"
                            onPress={onClose}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            isDisabled={isSubmitting || !title.trim()}
                            tone="primary"
                            type="submit"
                        >
                            <FilePlus2 className="h-4 w-4" />
                            {isSubmitting ? "Creating..." : "Create"}
                        </Button>
                    </div>
                </form>
            </Surface>
        </div>
    );
}
