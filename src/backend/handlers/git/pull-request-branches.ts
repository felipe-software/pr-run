import { worktreePathFor } from "@/backend/handlers/git/helpers";
import type { GitHubPullRequest } from "@/backend/handlers/git/github";
import type { WorktreeInventory } from "@/backend/handlers/git/worktree-inventory";
import type {
    BranchInfo,
    GitHubRepositoryInfo,
    ProjectConfig,
    PullRequestInfo,
} from "@/backend/types";

type MergePullRequestBranchesParams = {
    branches: BranchInfo[];
    inventory: WorktreeInventory;
    project: ProjectConfig;
    pullRequests: GitHubPullRequest[];
    repository: GitHubRepositoryInfo;
};

function mergeWithBranches({
    branches,
    inventory,
    project,
    pullRequests,
    repository,
}: MergePullRequestBranchesParams) {
    const branchesByName = new Map(
        branches.map((branch) => [branch.name, branch]),
    );
    const pullRequestsByBranch = selectPullRequestsByBranch(pullRequests);
    const pullRequestBranches = [...pullRequestsByBranch.values()].flatMap(
        (pullRequest) => {
            const existingBranch = branchesByName.get(pullRequest.branchName);

            if (pullRequest.state !== "OPEN" && !existingBranch) {
                return [];
            }

            return [
                pullRequest.state === "OPEN"
                    ? openPullRequestBranch({
                          existingBranch,
                          inventory,
                          project,
                          pullRequest,
                          repository,
                      })
                    : historicalPullRequestBranch(
                          existingBranch!,
                          pullRequest,
                          repository,
                      ),
            ];
        },
    );
    const pullRequestBranchNames = new Set(
        pullRequestBranches.map((branch) => branch.name),
    );

    return [
        ...pullRequestBranches,
        ...branches.filter(
            (branch) => !pullRequestBranchNames.has(branch.name),
        ),
    ];
}

function selectPullRequestsByBranch(pullRequests: GitHubPullRequest[]) {
    const selectedPullRequests = new Map<string, GitHubPullRequest>();

    for (const pullRequest of pullRequests) {
        const selectedPullRequest = selectedPullRequests.get(
            pullRequest.branchName,
        );

        if (
            !selectedPullRequest ||
            isPullRequestPreferred(pullRequest, selectedPullRequest)
        ) {
            selectedPullRequests.set(pullRequest.branchName, pullRequest);
        }
    }

    return selectedPullRequests;
}

function isPullRequestPreferred(
    candidate: GitHubPullRequest,
    current: GitHubPullRequest,
) {
    if (candidate.state === "OPEN" && current.state !== "OPEN") {
        return true;
    }

    if (candidate.state !== "OPEN" && current.state === "OPEN") {
        return false;
    }

    const candidateTimestamp = Date.parse(candidate.updatedAt ?? "");
    const currentTimestamp = Date.parse(current.updatedAt ?? "");
    const normalizedCandidateTimestamp = Number.isFinite(candidateTimestamp)
        ? candidateTimestamp
        : 0;
    const normalizedCurrentTimestamp = Number.isFinite(currentTimestamp)
        ? currentTimestamp
        : 0;

    if (normalizedCandidateTimestamp !== normalizedCurrentTimestamp) {
        return normalizedCandidateTimestamp > normalizedCurrentTimestamp;
    }

    return candidate.number > current.number;
}

function openPullRequestBranch(params: {
    existingBranch?: BranchInfo;
    inventory: WorktreeInventory;
    project: ProjectConfig;
    pullRequest: GitHubPullRequest;
    repository: GitHubRepositoryInfo;
}): BranchInfo {
    const { existingBranch, inventory, project, pullRequest, repository } =
        params;
    const worktree = inventory.byBranch.get(pullRequest.branchName);
    const updatedTimestamp = Date.parse(pullRequest.updatedAt ?? "");

    return {
        compareBranchName: pullRequest.baseBranchName,
        hasWorktree: existingBranch?.hasWorktree ?? Boolean(worktree),
        isStale: false,
        lastCommitTimestamp: Number.isFinite(updatedTimestamp)
            ? updatedTimestamp
            : null,
        name: pullRequest.branchName,
        pullRequest: pullRequestInfo(pullRequest),
        remoteName:
            existingBranch?.remoteName ?? `origin/${pullRequest.branchName}`,
        repository,
        source: "pull-request",
        worktreePath:
            existingBranch?.worktreePath ??
            worktree?.path ??
            worktreePathFor(project.path, pullRequest.branchName),
    };
}

function historicalPullRequestBranch(
    branch: BranchInfo,
    pullRequest: GitHubPullRequest,
    repository: GitHubRepositoryInfo,
): BranchInfo {
    return {
        ...branch,
        compareBranchName: pullRequest.baseBranchName,
        pullRequest: pullRequestInfo(pullRequest),
        repository,
        source: "pull-request",
    };
}

function pullRequestInfo(pullRequest: GitHubPullRequest): PullRequestInfo {
    return {
        additions: pullRequest.additions,
        assignees: pullRequest.assignees,
        author: pullRequest.author,
        baseBranchName: pullRequest.baseBranchName,
        changedFiles: pullRequest.changedFiles,
        deletions: pullRequest.deletions,
        isDraft: pullRequest.isDraft,
        latestReviews: pullRequest.latestReviews,
        number: pullRequest.number,
        reviewRequests: pullRequest.reviewRequests,
        state: pullRequest.state,
        title: pullRequest.title,
        url: pullRequest.url,
    };
}

export const pullRequestBranchHandler = {
    mergeWithBranches,
};
