import { tryPromise } from "@/backend/handlers/error";
import {
    findGitHubRepository,
    getGitHubPullRequestIdentity,
    GhCommandError,
} from "@/backend/handlers/git/github";
import { getGitHubReviewSnapshot } from "@/backend/handlers/git/github-activity";
import { getCommitHistory } from "@/backend/handlers/git/history";
import { logger } from "@/backend/logger";
import type {
    CommitInfo,
    ProjectConfig,
    WorktreeActivityItem,
    WorktreeActivityResult,
} from "@/backend/types";

export async function getWorktreeActivity(
    project: ProjectConfig,
    branch: string,
    baseBranch?: string,
    pullRequestNumber?: number,
): Promise<WorktreeActivityResult> {
    const commits = await getCommitHistory(
        project,
        branch,
        baseBranch,
        pullRequestNumber,
    );
    let { baseCommits, branchItems } = partitionActivityCommits(commits);

    if (!pullRequestNumber) {
        return {
            baseCommits,
            integration: {
                message: "Review activity is available for pull requests.",
                reason: "not-a-pull-request",
                status: "unavailable",
            },
            items: branchItems,
            reviewComments: [],
        };
    }

    const repository = await findGitHubRepository(project);

    if (!repository) {
        return unavailableActivity(
            baseCommits,
            branchItems,
            "GitHub authentication is unavailable for this project.",
            "not-authenticated",
        );
    }

    const [identityError, identity] = await tryPromise(
        getGitHubPullRequestIdentity(project, repository, pullRequestNumber),
    );

    if (identityError) {
        if (
            identityError instanceof GhCommandError &&
            identityError.httpStatus === 404
        ) {
            return unavailableActivity(
                baseCommits,
                branchItems,
                `Pull request #${pullRequestNumber} was not found.`,
                "pull-request-not-found",
            );
        }

        return unavailableActivity(
            baseCommits,
            branchItems,
            "GitHub review activity could not be loaded.",
            "request-failed",
        );
    }

    if (identity.headRefName !== branch.replace(/^origin\//, "")) {
        return unavailableActivity(
            baseCommits,
            branchItems,
            `Pull request #${pullRequestNumber} does not belong to ${branch}.`,
            "pull-request-mismatch",
        );
    }

    const [error, snapshot] = await tryPromise(
        getGitHubReviewSnapshot(project, repository, pullRequestNumber),
    );

    if (error) {
        logger.warn(
            { error, projectId: project.id, pullRequestNumber },
            "failed to load pull request review activity",
        );
        return unavailableActivity(
            baseCommits,
            branchItems,
            "GitHub review activity could not be loaded.",
            "request-failed",
        );
    }

    ({ baseCommits, branchItems } = partitionActivityCommits(
        commits,
        snapshot.pullRequestCommitHashes,
    ));

    const items: WorktreeActivityItem[] = [
        ...branchItems,
        ...snapshot.comments.map(
            (comment): WorktreeActivityItem => ({
                comment,
                id: `comment:${comment.id}`,
                occurredAt: comment.createdAt,
                type: "comment",
            }),
        ),
        ...snapshot.reviews.map(
            (review): WorktreeActivityItem => ({
                id: `review:${review.id}`,
                occurredAt: review.submittedAt,
                review,
                type: "review",
            }),
        ),
    ].sort(compareActivityItems);

    return {
        baseCommits,
        integration: { status: "available" },
        items,
        pendingReview: snapshot.pendingReview,
        reviewComments: snapshot.reviewComments,
        reviewDecision: snapshot.reviewDecision,
        viewer: snapshot.viewer,
    };
}

export function partitionActivityCommits(
    commits: CommitInfo[],
    pullRequestCommitHashes?: string[],
) {
    const pullRequestHashes = pullRequestCommitHashes
        ? new Set(pullRequestCommitHashes)
        : undefined;
    const isConversationCommit = (commit: CommitInfo) =>
        pullRequestHashes
            ? pullRequestHashes.has(commit.hash)
            : commit.isInSelectedBranch;
    const baseCommits = commits
        .filter((commit) => !isConversationCommit(commit))
        .reverse();
    const branchItems: WorktreeActivityItem[] = commits
        .filter(isConversationCommit)
        .reverse()
        .map((commit) => ({
            commit,
            id: `commit:${commit.hash}`,
            occurredAt: commit.date,
            type: "commit",
        }));

    return { baseCommits, branchItems };
}

function unavailableActivity(
    baseCommits: WorktreeActivityResult["baseCommits"],
    items: WorktreeActivityItem[],
    message: string,
    reason:
        | "not-authenticated"
        | "pull-request-mismatch"
        | "pull-request-not-found"
        | "request-failed",
): WorktreeActivityResult {
    return {
        baseCommits,
        integration: { message, reason, status: "unavailable" },
        items,
        reviewComments: [],
    };
}

export function compareActivityItems(
    left: WorktreeActivityItem,
    right: WorktreeActivityItem,
) {
    const dateDifference =
        Date.parse(left.occurredAt) - Date.parse(right.occurredAt);

    return dateDifference || left.id.localeCompare(right.id);
}
