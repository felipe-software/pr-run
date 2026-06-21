import { Input, Label } from "@heroui/react";
import { FilePlus2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/lib/components/atoms/button";
import { Surface } from "@/lib/components/atoms/surface";

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
        <div
            className="fixed inset-0 z-50 flex items-center justify-center
                bg-black/35 px-4"
        >
            <Surface className="w-full max-w-lg shadow-xl">
                <form className="p-4" onSubmit={handleSubmit}>
                    <div className="mb-4 flex items-start gap-3">
                        <div
                            className="border-border bg-muted/20 text-primary
                                flex size-8 shrink-0 items-center justify-center
                                rounded-md border"
                        >
                            <FilePlus2 className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">
                                Create script
                            </h2>
                            <p className="text-muted-foreground mt-0.5 text-sm">
                                Create a global TypeScript script available to
                                every project.
                            </p>
                        </div>
                    </div>

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
                        <Surface
                            className="mt-3 px-3 py-2 text-sm"
                            variant="danger"
                        >
                            {error}
                        </Surface>
                    ) : null}

                    <div className="mt-5 flex justify-end gap-2">
                        <Button
                            isDisabled={isSubmitting}
                            type="button"
                            variant="ghost"
                            onPress={onClose}
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                        <Button
                            isDisabled={isSubmitting || !title.trim()}
                            type="submit"
                            variant="primary"
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
