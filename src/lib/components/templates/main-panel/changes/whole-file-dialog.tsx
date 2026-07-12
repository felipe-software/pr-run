import { CodeView, type CodeViewItem } from "@pierre/diffs/react";
import { FileCode2, LoaderCircle } from "lucide-react";
import { useMemo } from "react";

import { FileCommitStack } from "@/lib/components/templates/main-panel/changes/file-commit-stack";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogPopup,
    DialogTitle,
} from "@/lib/components/ui/dialog";
import { useBranchFileQuery } from "@/lib/hooks/query/use-branch-file-query";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { BranchDiffFile } from "@/types/pr-run";

export function WholeFileDialog({
    branchName,
    baseBranchName,
    file,
    onOpenChange,
    open,
    projectId,
    shouldWrap,
}: {
    branchName: string;
    baseBranchName?: string;
    file?: BranchDiffFile;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    projectId: string;
    shouldWrap: boolean;
}) {
    const sourceBranchName =
        file?.status === "deleted" ? baseBranchName : branchName;
    const sourcePath =
        file?.status === "deleted"
            ? (file.previousPath ?? file.path)
            : file?.path;
    const fileQuery = useBranchFileQuery(
        projectId,
        sourceBranchName ?? branchName,
        sourcePath,
        open,
    );
    const items = useMemo<CodeViewItem[]>(
        () =>
            fileQuery.data
                ? [
                      {
                          file: {
                              cacheKey: `${projectId}:${sourceBranchName}:${fileQuery.data.path}`,
                              contents: fileQuery.data.contents,
                              name: fileQuery.data.path,
                          },
                          id: fileQuery.data.path,
                          type: "file",
                      },
                  ]
                : [],
        [fileQuery.data, projectId, sourceBranchName],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPopup
                className="h-[calc(100dvh-1rem)] max-h-none w-[calc(100vw-1rem)]
                    max-w-none overflow-hidden rounded-lg"
            >
                <DialogHeader
                    className="border-border bg-surface shrink-0 border-b px-3
                        pt-2.5 pb-2"
                >
                    <div className="flex min-w-0 items-center gap-2 pr-7">
                        <FileCode2
                            className="text-muted-foreground size-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="truncate font-mono text-sm">
                                {file?.path ?? "Whole file"}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Fullscreen virtualized source file viewer
                            </DialogDescription>
                        </div>
                        {file ? (
                            <FileCommitStack
                                className="max-w-[55vw]"
                                commits={file.commits}
                            />
                        ) : null}
                    </div>
                </DialogHeader>

                <div className="bg-background min-h-0 flex-1 overflow-hidden">
                    {fileQuery.isPending ? (
                        <div
                            className="text-muted-foreground flex h-full
                                items-center justify-center gap-2 text-sm"
                        >
                            <LoaderCircle className="size-4 animate-spin" />
                            Loading the whole file…
                        </div>
                    ) : fileQuery.error ? (
                        <div
                            className="text-danger flex h-full items-center
                                justify-center px-6 text-sm"
                        >
                            {getErrorMessage(fileQuery.error)}
                        </div>
                    ) : (
                        <CodeView
                            className="h-full min-h-0 overflow-auto
                                overscroll-contain"
                            disableWorkerPool
                            items={items}
                            options={{
                                layout: {
                                    gap: 0,
                                    paddingBottom: 12,
                                    paddingTop: 0,
                                },
                                lineHoverHighlight: "line",
                                overflow: shouldWrap ? "wrap" : "scroll",
                                stickyHeaders: true,
                                themeType: "system",
                            }}
                        />
                    )}
                </div>
            </DialogPopup>
        </Dialog>
    );
}
