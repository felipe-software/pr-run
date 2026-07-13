import type {
    BranchDiffResult,
    BranchFileContent,
    CommitInfo,
    WorktreeActivityResult,
} from "@/types/pr-run";
import { projectPath } from "./projects";
import { requestMany, requestOne } from "./transport";

export const gitApi = {
    getBranchDiff(
        projectId: string,
        branch: string,
        baseBranch?: string,
        pullRequestNumber?: number,
    ) {
        return requestOne<BranchDiffResult>(
            withBranchQuery(
                projectPath(projectId, "/diff"),
                branch,
                baseBranch,
                pullRequestNumber,
            ),
        );
    },
    getBranchFile(projectId: string, branch: string, path: string) {
        return requestOne<BranchFileContent>(
            `${projectPath(projectId, "/file")}?${new URLSearchParams({ branch, path })}`,
        );
    },
    getCommitDiff(projectId: string, hash: string) {
        return requestOne<BranchDiffResult>(
            projectPath(projectId, `/commits/${encodeURIComponent(hash)}/diff`),
        );
    },
    getCommitHistory(
        projectId: string,
        branch: string,
        baseBranch?: string,
        pullRequestNumber?: number,
    ) {
        return requestMany<CommitInfo>(
            withBranchQuery(
                projectPath(projectId, "/commits"),
                branch,
                baseBranch,
                pullRequestNumber,
            ),
        );
    },
    getWorktreeActivity(
        projectId: string,
        branch: string,
        baseBranch?: string,
        pullRequestNumber?: number,
    ) {
        return requestOne<WorktreeActivityResult>(
            withBranchQuery(
                projectPath(projectId, "/activity"),
                branch,
                baseBranch,
                pullRequestNumber,
            ),
        );
    },
};

function withBranchQuery(
    path: string,
    branch: string,
    baseBranch?: string,
    pullRequestNumber?: number,
) {
    const params = new URLSearchParams({ branch });

    if (baseBranch) {
        params.set("baseBranch", baseBranch);
    }
    if (pullRequestNumber) {
        params.set("pullRequestNumber", String(pullRequestNumber));
    }

    return `${path}?${params}`;
}
