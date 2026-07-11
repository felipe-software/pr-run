import { parsePatchFiles } from "@pierre/diffs";
import { useEffect, useMemo, useState } from "react";

import { isHandledSshPromptError } from "@/lib/api";
import { EmptyState } from "@/lib/components/atoms/empty-state";
import { Skeleton } from "@/lib/components/atoms/skeleton";
import { Surface } from "@/lib/components/atoms/surface";
import { ReviewComposer } from "@/lib/components/templates/main-panel/activity/review-composer";
import {
    ChangesToolbar,
    type DiffReviewMode,
} from "@/lib/components/templates/main-panel/changes/changes-toolbar";
import { ContinuousDiff } from "@/lib/components/templates/main-panel/changes/continuous-diff";
import type { DiffCommentDraft } from "@/lib/components/templates/main-panel/changes/diff-review-types";
import { FilePicker } from "@/lib/components/templates/main-panel/changes/file-picker";
import { FocusedDiff } from "@/lib/components/templates/main-panel/changes/focused-diff";
import { useBranchDiffQuery } from "@/lib/hooks/query/use-branch-diff-query";
import { useSshPassphraseStore } from "@/lib/hooks/store/use-ssh-passphrase-store";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { WorktreeActivityResult } from "@/types/pr-run";

type WorktreeChangesProps = {
    activity?: WorktreeActivityResult;
    activityError?: string;
    baseBranchName?: string;
    branchName: string;
    projectId: string;
    pullRequestNumber?: number;
};

const REVIEW_MODE_KEY = "pr-run.diff.review-mode";
const WRAP_LINES_KEY = "pr-run.diff.wrap-lines";
const VIEW_MODE_KEY = "pr-run.diff.view-mode";

export function WorktreeChanges({
    activity,
    activityError,
    baseBranchName,
    branchName,
    projectId,
    pullRequestNumber,
}: WorktreeChangesProps) {
    const [mode, setMode] = useState<DiffReviewMode>(() =>
        localStorage.getItem(REVIEW_MODE_KEY) === "focused"
            ? "focused"
            : "continuous",
    );
    const [isUnified, setIsUnified] = useState(
        () => localStorage.getItem(VIEW_MODE_KEY) !== "split",
    );
    const [shouldWrap, setShouldWrap] = useState(
        () => localStorage.getItem(WRAP_LINES_KEY) === "true",
    );
    const [selectedPath, setSelectedPath] = useState<string>();
    const [continuousTargetPath, setContinuousTargetPath] = useState<string>();
    const [draft, setDraft] = useState<DiffCommentDraft>();
    const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const diffQuery = useBranchDiffQuery(projectId, branchName, baseBranchName);
    const isAwaitingSshPassphrase = isHandledSshPromptError(diffQuery.error);
    const fileDiffs = useMemo(
        () => parseFileDiffs(diffQuery.data?.patch ?? "", branchName),
        [branchName, diffQuery.data?.patch],
    );
    const selectedIndex = Math.max(
        0,
        fileDiffs.findIndex((file) => file.name === selectedPath),
    );
    const selectedFileDiff = fileDiffs[selectedIndex];

    useEffect(() => {
        setSelectedPath(undefined);
        setDraft(undefined);
    }, [branchName, projectId]);

    useEffect(() => {
        const firstPath = fileDiffs[0]?.name;
        const selectionExists = fileDiffs.some(
            (file) => file.name === selectedPath,
        );

        if (firstPath && (!selectedPath || !selectionExists)) {
            setSelectedPath(firstPath);
            setDraft(undefined);
        }
    }, [fileDiffs, selectedPath]);

    useEffect(() => {
        localStorage.setItem(REVIEW_MODE_KEY, mode);
    }, [mode]);

    useEffect(() => {
        localStorage.setItem(VIEW_MODE_KEY, isUnified ? "unified" : "split");
    }, [isUnified]);

    useEffect(() => {
        localStorage.setItem(WRAP_LINES_KEY, String(shouldWrap));
    }, [shouldWrap]);

    useEffect(() => {
        if (!isAwaitingSshPassphrase) {
            return;
        }

        useSshPassphraseStore
            .getState()
            .setRetryAction("main-panel:diff", () =>
                diffQuery.refetch().then(() => undefined),
            );
        return () =>
            useSshPassphraseStore
                .getState()
                .setRetryAction("main-panel:diff", null);
    }, [diffQuery, isAwaitingSshPassphrase]);

    if (diffQuery.isPending) {
        return <ChangesSkeleton />;
    }

    if (isAwaitingSshPassphrase) {
        return (
            <Surface className="px-3 py-2 text-sm" variant="muted">
                Waiting for SSH passphrase…
            </Surface>
        );
    }

    if (diffQuery.error && !diffQuery.data) {
        return (
            <Surface className="px-3 py-2 text-sm" variant="danger">
                {getErrorMessage(diffQuery.error)}
            </Surface>
        );
    }

    if (!diffQuery.data || diffQuery.data.files.length === 0) {
        return (
            <Surface className="min-h-48" variant="muted">
                <EmptyState
                    description="This branch does not change files compared with its base."
                    title="No changed files"
                />
            </Surface>
        );
    }

    function selectFile(path: string) {
        setSelectedPath(path);
        setDraft(undefined);

        if (mode === "continuous") {
            setContinuousTargetPath(undefined);
            requestAnimationFrame(() => setContinuousTargetPath(path));
        }
    }

    const reviewComments = activity?.reviewComments ?? [];
    const pendingCommentCount = activity?.pendingReview?.comments.length ?? 0;

    return (
        <section
            className="border-border bg-surface flex h-full min-h-0 flex-1
                flex-col overflow-hidden rounded-lg border"
        >
            <ChangesToolbar
                additions={diffQuery.data.additions}
                deletions={diffQuery.data.deletions}
                fileCount={diffQuery.data.files.length}
                isUnified={isUnified}
                mode={mode}
                pendingCommentCount={pendingCommentCount}
                selectedPath={selectedPath}
                shouldWrap={shouldWrap}
                onChangeMode={(nextMode) => {
                    setMode(nextMode);
                    setDraft(undefined);
                }}
                onOpenFiles={() => setIsFilePickerOpen(true)}
                onOpenReview={() => setIsReviewOpen((open) => !open)}
                onToggleUnified={() => setIsUnified((value) => !value)}
                onToggleWrap={() => setShouldWrap((value) => !value)}
            />

            {activityError ? (
                <div
                    className="border-danger/25 bg-danger/8
                        text-danger-foreground border-b px-3 py-2 text-xs"
                >
                    {activityError} Review comments and actions are unavailable.
                </div>
            ) : null}

            <div className="bg-background min-h-0 flex-1 overflow-hidden">
                {mode === "continuous" ? (
                    <ContinuousDiff
                        baseBranchName={baseBranchName}
                        branchName={branchName}
                        comments={reviewComments}
                        draft={draft}
                        fileDiffs={fileDiffs}
                        files={diffQuery.data.files}
                        isUnified={isUnified}
                        projectId={projectId}
                        pullRequestNumber={pullRequestNumber}
                        shouldWrap={shouldWrap}
                        targetPath={continuousTargetPath}
                        onChangeDraft={setDraft}
                    />
                ) : selectedFileDiff ? (
                    <FocusedDiff
                        baseBranchName={baseBranchName}
                        branchName={branchName}
                        comments={reviewComments}
                        draft={draft}
                        fileDiff={selectedFileDiff}
                        hasNext={selectedIndex < fileDiffs.length - 1}
                        hasPrevious={selectedIndex > 0}
                        isUnified={isUnified}
                        projectId={projectId}
                        pullRequestNumber={pullRequestNumber}
                        shouldWrap={shouldWrap}
                        onChangeDraft={setDraft}
                        onNext={() => {
                            const path = fileDiffs[selectedIndex + 1]?.name;
                            if (path) selectFile(path);
                        }}
                        onPrevious={() => {
                            const path = fileDiffs[selectedIndex - 1]?.name;
                            if (path) selectFile(path);
                        }}
                    />
                ) : null}
            </div>

            {isReviewOpen &&
            pullRequestNumber &&
            activity?.integration.status === "available" ? (
                <div className="max-h-[24rem] shrink-0 overflow-y-auto">
                    <ReviewComposer
                        key={`${projectId}:${pullRequestNumber}`}
                        baseBranchName={baseBranchName}
                        branchName={branchName}
                        pendingReview={activity.pendingReview}
                        projectId={projectId}
                        pullRequestNumber={pullRequestNumber}
                    />
                </div>
            ) : null}

            <FilePicker
                files={diffQuery.data.files}
                onOpenChange={setIsFilePickerOpen}
                onSelect={selectFile}
                open={isFilePickerOpen}
                selectedPath={selectedPath}
            />
        </section>
    );
}

function parseFileDiffs(patch: string, branchName: string) {
    if (!patch.trim()) {
        return [];
    }

    return parsePatchFiles(patch, branchName).flatMap((item) => item.files);
}

function ChangesSkeleton() {
    return (
        <Surface className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
                className="flex h-11 items-center justify-between border-b px-3"
            >
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-64" />
            </div>
            <div className="grid gap-2 p-3">
                <Skeleton className="h-7 w-72" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-10/12" />
            </div>
        </Surface>
    );
}
