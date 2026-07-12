import { tryPromise } from "@/backend/handlers/error";
import { gitQuiet } from "@/backend/handlers/git/command";
import { listBranchesWithPullRequests } from "@/backend/handlers/git/worktrees";
import type { ProjectConfig } from "@/backend/types";
import type {
    OverviewProjectSummary,
    OverviewPullRequestChange,
    OverviewScope,
    OverviewSnapshot,
    OverviewTotals,
    OverviewUnavailableProject,
} from "@/types/overview";

const PROJECT_CONCURRENCY = 3;

const emptyTotals = (): OverviewTotals => ({
    additions: 0,
    branches: 0,
    changedFiles: 0,
    deletions: 0,
    openPullRequests: 0,
    staleBranches: 0,
    worktrees: 0,
});

export async function getOverviewSnapshot(
    projects: ProjectConfig[],
    scope: OverviewScope,
): Promise<OverviewSnapshot> {
    const results = await mapWithConcurrency(
        projects,
        PROJECT_CONCURRENCY,
        async (project) => {
            const [error, overview] = await tryPromise(
                getProjectOverview(project),
            );

            if (error) {
                return {
                    type: "unavailable" as const,
                    value: unavailableProject(project, error),
                };
            }

            return { type: "ready" as const, value: overview };
        },
    );
    const totals = emptyTotals();
    const projectSummaries: OverviewProjectSummary[] = [];
    const pullRequests: OverviewPullRequestChange[] = [];
    const recentPullRequests: OverviewPullRequestChange[] = [];
    const unavailableProjects: OverviewUnavailableProject[] = [];

    for (const result of results) {
        if (result.type === "unavailable") {
            unavailableProjects.push(result.value);
            continue;
        }

        projectSummaries.push(result.value.summary);
        pullRequests.push(...result.value.pullRequests);
        recentPullRequests.push(...result.value.recentPullRequests);
        addTotals(totals, result.value.summary);
    }

    pullRequests.sort(
        (left, right) =>
            right.additions +
            right.deletions -
            (left.additions + left.deletions),
    );

    return {
        generatedAt: new Date().toISOString(),
        projects: projectSummaries.sort((left, right) =>
            left.projectName.localeCompare(right.projectName),
        ),
        pullRequests,
        recentPullRequests: recentPullRequests
            .sort(
                (left, right) =>
                    Date.parse(right.updatedAt ?? "") -
                    Date.parse(left.updatedAt ?? ""),
            )
            .slice(0, 12),
        scope,
        totals,
        unavailableProjects,
    };
}

async function getProjectOverview(project: ProjectConfig) {
    await gitQuiet(project.path, ["fetch", "origin"]);

    const { branches, pullRequests: githubPullRequests } =
        await listBranchesWithPullRequests(project);
    const openPullRequests = githubPullRequests.filter(
        (pullRequest) => pullRequest.state === "OPEN",
    );
    const pullRequests = openPullRequests.map((pullRequest) =>
        overviewPullRequest(project, pullRequest),
    );
    const recentPullRequests = githubPullRequests
        .filter((pullRequest) => pullRequest.state !== "OPEN")
        .sort(
            (left, right) =>
                Date.parse(right.updatedAt ?? "") -
                Date.parse(left.updatedAt ?? ""),
        )
        .slice(0, 8)
        .map((pullRequest) => overviewPullRequest(project, pullRequest));
    const summary: OverviewProjectSummary = {
        additions: sumBy(pullRequests, (pullRequest) => pullRequest.additions),
        branches: branches.length,
        changedFiles: sumBy(
            pullRequests,
            (pullRequest) => pullRequest.changedFiles,
        ),
        deletions: sumBy(pullRequests, (pullRequest) => pullRequest.deletions),
        openPullRequests: openPullRequests.length,
        projectId: project.id,
        projectName: project.name,
        staleBranches: branches.filter((branch) => branch.isStale).length,
        worktrees: branches.filter((branch) => branch.hasWorktree).length,
    };

    return { pullRequests, recentPullRequests, summary };
}

function overviewPullRequest(
    project: ProjectConfig,
    pullRequest: Awaited<
        ReturnType<typeof listBranchesWithPullRequests>
    >["pullRequests"][number],
): OverviewPullRequestChange {
    return {
        additions: pullRequest.additions,
        branchName: pullRequest.branchName,
        changedFiles: pullRequest.changedFiles,
        deletions: pullRequest.deletions,
        number: pullRequest.number,
        projectId: project.id,
        projectName: project.name,
        state: pullRequest.state,
        title: pullRequest.title,
        updatedAt: pullRequest.updatedAt,
        url: pullRequest.url,
    };
}

export function parseOverviewDiffStats(output: string) {
    const files = output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [additions, deletions] = line.split("\t");

            return {
                additions: parseDiffNumber(additions),
                deletions: parseDiffNumber(deletions),
            };
        });

    return {
        additions: sumBy(files, (file) => file.additions),
        changedFiles: files.length,
        deletions: sumBy(files, (file) => file.deletions),
    };
}

function parseDiffNumber(value: string | undefined) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function unavailableProject(
    project: ProjectConfig,
    error: unknown,
): OverviewUnavailableProject {
    return {
        message: error instanceof Error ? error.message : String(error),
        projectId: project.id,
        projectName: project.name,
    };
}

function addTotals(target: OverviewTotals, source: OverviewTotals) {
    target.additions += source.additions;
    target.branches += source.branches;
    target.changedFiles += source.changedFiles;
    target.deletions += source.deletions;
    target.openPullRequests += source.openPullRequests;
    target.staleBranches += source.staleBranches;
    target.worktrees += source.worktrees;
}

function sumBy<T>(items: T[], select: (item: T) => number) {
    return items.reduce((total, item) => total + select(item), 0);
}

async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    map: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = [];
    let cursor = 0;
    const workerCount = Math.min(limit, items.length);

    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (cursor < items.length) {
                const itemIndex = cursor;
                cursor += 1;
                results[itemIndex] = await map(items[itemIndex]!);
            }
        }),
    );

    return results;
}
