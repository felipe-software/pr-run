import {
    checkoutBranch,
    listBranches,
    removeWorktree,
    updateProjectWorktrees,
    updateWorktree,
} from "@/backend/handlers/git/worktrees";
import {
    getBranchDiff,
    getBranchFileContent,
    getCommitDiff,
} from "@/backend/handlers/git/diff";
import { getCommitHistory } from "@/backend/handlers/git/history";
import { getOverviewSnapshot } from "@/backend/handlers/git/overview";
import { validateProjectPath } from "@/backend/handlers/git/helpers";
import { getWorktreeActivity } from "@/backend/handlers/git/activity";
import { getGitHubMedia } from "@/backend/handlers/git/github-media";
import { findGitHubRepository } from "@/backend/handlers/git/github";
import {
    addPullRequestComment,
    addPullRequestReviewComment,
    discardPendingPullRequestReview,
    submitPullRequestReview,
    type ReviewCommentInput,
} from "@/backend/handlers/git/github-review";
import {
    ApiError,
    type ProjectConfig,
    type ReviewEvent,
} from "@/backend/types";
//
async function requireGitHubRepository(project: ProjectConfig) {
    const repository = await findGitHubRepository(project);

    if (!repository) {
        throw new ApiError(
            "GITHUB_INTEGRATION_FAILED",
            "GitHub is unavailable for this project.",
            503,
        );
    }

    return repository;
}

async function addReviewComment(
    project: ProjectConfig,
    pullRequestNumber: number,
    input: ReviewCommentInput,
) {
    return await addPullRequestReviewComment(
        project,
        await requireGitHubRepository(project),
        pullRequestNumber,
        input,
    );
}

async function addGeneralComment(
    project: ProjectConfig,
    pullRequestNumber: number,
    body: string,
) {
    return await addPullRequestComment(
        project,
        await requireGitHubRepository(project),
        pullRequestNumber,
        body,
    );
}

async function submitReview(
    project: ProjectConfig,
    pullRequestNumber: number,
    event: ReviewEvent,
    body?: string,
) {
    return await submitPullRequestReview(
        project,
        await requireGitHubRepository(project),
        pullRequestNumber,
        event,
        body,
    );
}

async function discardPendingReview(
    project: ProjectConfig,
    pullRequestNumber: number,
) {
    return await discardPendingPullRequestReview(
        project,
        await requireGitHubRepository(project),
        pullRequestNumber,
    );
}

export const gitHandler = {
    addGeneralComment,
    addReviewComment,
    checkoutBranch,
    discardPendingReview,
    getBranchDiff,
    getBranchFileContent,
    getCommitHistory,
    getCommitDiff,
    getGitHubMedia,
    getOverviewSnapshot,
    getWorktreeActivity,
    listBranches,
    removeWorktree,
    submitReview,
    updateProjectWorktrees,
    updateWorktree,
    validateProjectPath,
};
