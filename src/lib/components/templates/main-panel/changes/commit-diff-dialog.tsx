import { parsePatchFiles } from "@pierre/diffs";
import { GitCommitHorizontal, LoaderCircle } from "lucide-react";
import { useMemo } from "react";

import { ContinuousDiff } from "@/lib/components/templates/main-panel/changes/continuous-diff";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogPopup,
    DialogTitle,
} from "@/lib/components/ui/dialog";
import { useCommitDiffQuery } from "@/lib/hooks/query/use-commit-diff-query";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { CommitInfo } from "@/types/pr-run";

export function CommitDiffDialog({
    commit,
    onOpenChange,
    open,
    projectId,
}: {
    commit: CommitInfo;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    projectId: string;
}) {
    const diffQuery = useCommitDiffQuery(projectId, commit.hash, open);
    const fileDiffs = useMemo(
        () =>
            parsePatchFiles(
                diffQuery.data?.patch ?? "",
                `commit:${commit.hash}`,
            ).flatMap((patch) => patch.files),
        [commit.hash, diffQuery.data?.patch],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogPopup
                className="h-[min(48rem,calc(100dvh-2rem))] max-h-none
                    w-[min(76rem,calc(100vw-2rem))] max-w-none overflow-hidden"
            >
                <DialogHeader
                    className="border-border bg-surface shrink-0 border-b px-3
                        pt-2.5 pb-2"
                >
                    <div className="flex min-w-0 items-center gap-2 pr-7">
                        <GitCommitHorizontal
                            className="text-muted-foreground size-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="truncate text-sm">
                                {commit.subject}
                            </DialogTitle>
                            <DialogDescription
                                className="mt-0.5 flex items-center gap-2
                                    font-mono text-[10px]"
                            >
                                <span>{commit.shortHash}</span>
                                {diffQuery.data ? (
                                    <span>
                                        <span className="text-success">
                                            +{diffQuery.data.additions}
                                        </span>{" "}
                                        <span className="text-danger">
                                            −{diffQuery.data.deletions}
                                        </span>{" "}
                                        · {diffQuery.data.files.length} changed
                                        {diffQuery.data.files.length === 1
                                            ? " file"
                                            : " files"}
                                    </span>
                                ) : null}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="bg-background min-h-0 flex-1 overflow-hidden">
                    {diffQuery.isPending ? (
                        <div
                            className="text-muted-foreground flex h-full
                                items-center justify-center gap-2 text-sm"
                        >
                            <LoaderCircle className="size-4 animate-spin" />
                            Loading commit changes…
                        </div>
                    ) : diffQuery.error ? (
                        <div
                            className="text-danger flex h-full items-center
                                justify-center px-6 text-sm"
                        >
                            {getErrorMessage(diffQuery.error)}
                        </div>
                    ) : diffQuery.data && fileDiffs.length > 0 ? (
                        <ContinuousDiff
                            branchName={commit.hash}
                            comments={[]}
                            fileDiffs={fileDiffs}
                            files={diffQuery.data.files}
                            isUnified
                            projectId={projectId}
                            shouldWrap={false}
                            onChangeDraft={() => undefined}
                        />
                    ) : (
                        <div
                            className="text-muted-foreground flex h-full
                                items-center justify-center px-6 text-sm"
                        >
                            This commit does not contain a renderable text diff.
                        </div>
                    )}
                </div>
            </DialogPopup>
        </Dialog>
    );
}
