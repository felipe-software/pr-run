import { execFile } from "node:child_process";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { gitQuiet, gitText } from "@/backend/handlers/git/command";
import { getWorktreeActivity } from "@/backend/handlers/git/activity";
import {
    getBranchDiff,
    getBranchFileContent,
    getCommitDiff,
} from "@/backend/handlers/git/diff";
import {
    ensureRemoteRefs,
    exists,
    getDefaultRemoteBranch,
    hasLocalBranch,
    linkSharedEnv,
    listEnvFileNames,
    normalizeBranchName,
    numberOrZero,
    remoteBranch,
    validateProjectPath,
    worktreePathFor,
} from "@/backend/handlers/git/helpers";
import { getCommitHistory } from "@/backend/handlers/git/history";
import { getOverviewSnapshot } from "@/backend/handlers/git/overview";
import {
    listWorktreeInventory,
    requireWorktreePath,
} from "@/backend/handlers/git/worktree-inventory";
import {
    checkoutBranch,
    listBranches,
    removeWorktree,
    updateProjectWorktrees,
    updateWorktree,
} from "@/backend/handlers/git/worktrees";

const execFileAsync = promisify(execFile);

let temporaryDirectory = "";
let projectPath = "";
let originPath = "";
let featureHash = "";

const project = () => ({
    id: "project",
    name: "Project",
    path: projectPath,
});

async function git(cwd: string, ...args: string[]) {
    return await execFileAsync("git", args, { cwd });
}

beforeEach(async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "pr-run-git-"));
    projectPath = path.join(temporaryDirectory, "project");
    originPath = path.join(temporaryDirectory, "origin.git");
    await execFileAsync("git", ["init", "--bare", originPath]);
    await execFileAsync("git", ["init", "-b", "main", projectPath]);
    await git(projectPath, "config", "user.email", "tests@example.com");
    await git(projectPath, "config", "user.name", "PR Run Tests");
    await writeFile(path.join(projectPath, "README.md"), "root\n");
    await git(projectPath, "add", "README.md");
    await git(projectPath, "commit", "-m", "initial");
    await git(projectPath, "remote", "add", "origin", originPath);
    await git(projectPath, "push", "-u", "origin", "main");

    await git(projectPath, "checkout", "-b", "feature/coverage");
    await mkdir(path.join(projectPath, "docs"));
    await mkdir(path.join(projectPath, "src"));
    await git(projectPath, "mv", "README.md", "docs/README.md");
    await writeFile(
        path.join(projectPath, "src", "feature.ts"),
        "export const value = 1;\n",
    );
    await writeFile(
        path.join(projectPath, "image.bin"),
        new Uint8Array([0, 1, 2, 3]),
    );
    await git(projectPath, "add", ".");
    await git(projectPath, "commit", "-m", "feature files");
    featureHash = (await git(projectPath, "rev-parse", "HEAD")).stdout.trim();
    await git(projectPath, "push", "-u", "origin", "feature/coverage");
    await git(projectPath, "checkout", "main");
});

afterEach(async () => {
    await rm(temporaryDirectory, { force: true, recursive: true });
});

describe("Git command and helper integration", () => {
    test("runs text and quiet commands and reports ordinary failures", async () => {
        expect(
            (
                await gitText(projectPath, [
                    "rev-parse",
                    "--abbrev-ref",
                    "HEAD",
                ])
            ).trim(),
        ).toBe("main");
        await expect(
            gitQuiet(projectPath, ["rev-parse", "--verify", "refs/heads/main"]),
        ).resolves.toBeUndefined();
        await expect(
            gitText(projectPath, ["show", "missing-ref:file"]),
        ).rejects.toBeTruthy();
    });

    test("normalizes branch paths and inspects local and remote refs", async () => {
        expect(normalizeBranchName("origin/feature/a weird")).toBe(
            "feature-a-weird",
        );
        expect(remoteBranch("origin/feature/coverage")).toEqual({
            name: "feature/coverage",
            remoteName: "origin/feature/coverage",
        });
        expect(worktreePathFor(projectPath, "feature/coverage")).toBe(
            path.join(projectPath, ".pr-run", "feature-coverage"),
        );
        expect(numberOrZero("12")).toBe(12);
        expect(numberOrZero("binary")).toBe(0);
        expect(await hasLocalBranch(projectPath, "feature/coverage")).toBe(
            true,
        );
        expect(await hasLocalBranch(projectPath, "missing")).toBe(false);
        expect(await getDefaultRemoteBranch(projectPath)).toBe("origin/main");

        await ensureRemoteRefs(projectPath, [
            undefined,
            "origin/main",
            "origin/main",
            "origin/feature/coverage",
        ]);
        await expect(
            ensureRemoteRefs(projectPath, []),
        ).resolves.toBeUndefined();
    });

    test("validates repositories and shares environment files", async () => {
        const target = path.join(temporaryDirectory, "target");
        await mkdir(target);
        await writeFile(path.join(projectPath, ".env.production"), "PROD=1\n");
        await writeFile(path.join(projectPath, ".env"), "ROOT=1\n");
        await writeFile(path.join(projectPath, ".envrc"), "ignored\n");

        await expect(validateProjectPath(projectPath)).resolves.toBeUndefined();
        await expect(
            validateProjectPath(path.join(temporaryDirectory, "missing")),
        ).rejects.toMatchObject({ code: "INVALID_PROJECT_PATH" });
        const plainDirectory = path.join(temporaryDirectory, "plain");
        await mkdir(plainDirectory);
        await expect(validateProjectPath(plainDirectory)).rejects.toMatchObject(
            {
                code: "NOT_A_GIT_REPOSITORY",
            },
        );
        const filePath = path.join(temporaryDirectory, "file");
        await writeFile(filePath, "file");
        await expect(validateProjectPath(filePath)).rejects.toMatchObject({
            code: "INVALID_PROJECT_PATH",
        });

        expect(await listEnvFileNames(projectPath)).toEqual([
            ".env",
            ".env.production",
        ]);
        await linkSharedEnv(projectPath, target);
        expect(await exists(path.join(target, ".env"))).toBe(true);
        await writeFile(path.join(target, ".env.production"), "LOCAL=1\n");
        await linkSharedEnv(projectPath, target);
        expect(await exists(path.join(target, ".env.production"))).toBe(true);
    });
});

describe("worktree lifecycle", () => {
    test("lists remote branches and creates, reuses, updates, and removes a worktree", async () => {
        const branches = await listBranches(project());
        expect(branches.map((branch) => branch.name)).toEqual([
            "feature/coverage",
            "main",
        ]);
        expect(
            branches.find((branch) => branch.name === "feature/coverage")
                ?.hasWorktree,
        ).toBe(false);
        expect(
            branches.find((branch) => branch.name === "main")?.hasWorktree,
        ).toBe(true);

        const created = await checkoutBranch(
            project(),
            "origin/feature/coverage",
        );
        expect(created).toMatchObject({
            branch: "feature/coverage",
            status: "created",
        });
        expect(await requireWorktreePath(project(), "feature/coverage")).toBe(
            created.worktreePath,
        );
        expect(
            (await listWorktreeInventory(project())).byBranch.get(
                "feature/coverage",
            )?.path,
        ).toBe(created.worktreePath);

        expect(
            await checkoutBranch(project(), "feature/coverage"),
        ).toMatchObject({
            status: "ready",
            worktreePath: created.worktreePath,
        });
        expect(
            await updateWorktree(project(), "feature/coverage"),
        ).toMatchObject({ status: "updated" });
        expect(
            await removeWorktree(project(), "feature/coverage"),
        ).toMatchObject({ status: "removed" });
        expect(
            await requireWorktreePath(project(), "feature/coverage"),
        ).toBeNull();
    });

    test("reports missing branches and worktrees", async () => {
        await expect(
            checkoutBranch(project(), "missing"),
        ).rejects.toMatchObject({
            code: "BRANCH_NOT_FOUND",
            status: 404,
        });
        await expect(
            updateWorktree(project(), "missing"),
        ).rejects.toMatchObject({
            code: "WORKTREE_NOT_FOUND",
            status: 404,
        });
        await expect(
            removeWorktree(project(), "missing"),
        ).rejects.toMatchObject({
            code: "WORKTREE_NOT_FOUND",
            status: 404,
        });
    });

    test("batch-updates registered project worktrees", async () => {
        expect(await updateProjectWorktrees(project())).toMatchObject({
            skippedCount: 0,
            updatedCount: 0,
        });
        await checkoutBranch(project(), "feature/coverage");

        expect(await updateProjectWorktrees(project())).toMatchObject({
            skippedCount: 0,
            status: "updated",
            updatedCount: 1,
        });
    });
});

describe("history and diff integration", () => {
    test("classifies branch-only commits and attaches file statistics", async () => {
        const commits = await getCommitHistory(
            project(),
            "feature/coverage",
            "main",
        );

        expect(commits.some((commit) => commit.hash === featureHash)).toBe(
            true,
        );
        expect(
            commits.find((commit) => commit.hash === featureHash),
        ).toMatchObject({
            additions: 1,
            hasBinaryChanges: true,
            isInSelectedBranch: true,
            subject: "feature files",
        });
        expect(commits.some((commit) => !commit.isInSelectedBranch)).toBe(true);
    });

    test("reads branch diffs, branch files, and commit diffs", async () => {
        const diff = await getBranchDiff(project(), "feature/coverage", "main");

        expect(diff.branch).toBe("feature/coverage");
        expect(diff.patch).toContain("feature.ts");
        expect(diff.files.map((file) => file.path)).toContain("src/feature.ts");
        expect(diff.files.map((file) => file.path)).toContain("docs/README.md");
        expect(diff.files.some((file) => file.status === "binary")).toBe(true);
        expect(
            diff.files.find((file) => file.path === "src/feature.ts")
                ?.commits[0]?.hash,
        ).toBe(featureHash);

        expect(
            await getBranchFileContent(
                project(),
                "feature/coverage",
                "src/feature.ts",
            ),
        ).toMatchObject({
            branch: "feature/coverage",
            contents: "export const value = 1;\n",
            path: "src/feature.ts",
        });

        const commitDiff = await getCommitDiff(project(), featureHash);
        expect(commitDiff.branch).toBe(featureHash);
        expect(commitDiff.files).not.toHaveLength(0);
    });

    test("maps missing branch, file, and commit errors", async () => {
        await expect(
            getCommitHistory(project(), "missing", "main"),
        ).rejects.toMatchObject({ code: "BRANCH_NOT_FOUND", status: 404 });
        await expect(
            getBranchDiff(project(), "missing", "main"),
        ).rejects.toMatchObject({ code: "BRANCH_NOT_FOUND", status: 404 });
        await expect(
            getBranchFileContent(project(), "feature/coverage", "missing.ts"),
        ).rejects.toMatchObject({ code: "FILE_NOT_FOUND", status: 404 });
        await expect(
            getCommitDiff(project(), "deadbeef"),
        ).rejects.toMatchObject({ code: "COMMIT_NOT_FOUND", status: 404 });
    });
});

describe("overview and activity integration", () => {
    test("builds project totals and isolates unavailable projects", async () => {
        const snapshot = await getOverviewSnapshot(
            [
                project(),
                {
                    id: "missing",
                    name: "Missing",
                    path: path.join(temporaryDirectory, "missing"),
                },
            ],
            { type: "all" },
        );

        expect(snapshot.scope).toEqual({ type: "all" });
        expect(snapshot.projects).toEqual([
            expect.objectContaining({
                branches: 2,
                openPullRequests: 0,
                projectId: "project",
                projectName: "Project",
                worktrees: 1,
            }),
        ]);
        expect(snapshot.totals).toMatchObject({
            branches: 2,
            openPullRequests: 0,
            worktrees: 1,
        });
        expect(snapshot.pullRequests).toEqual([]);
        expect(snapshot.recentPullRequests).toEqual([]);
        expect(snapshot.unavailableProjects).toEqual([
            expect.objectContaining({
                projectId: "missing",
                projectName: "Missing",
            }),
        ]);
    });

    test("returns branch activity and explains unavailable GitHub review data", async () => {
        const branchActivity = await getWorktreeActivity(
            project(),
            "feature/coverage",
            "main",
        );

        expect(branchActivity.integration).toEqual({
            message: "Review activity is available for pull requests.",
            reason: "not-a-pull-request",
            status: "unavailable",
        });
        expect(
            branchActivity.items.some(
                (item) =>
                    item.type === "commit" && item.commit.hash === featureHash,
            ),
        ).toBe(true);
        expect(branchActivity.reviewComments).toEqual([]);

        const pullRequestActivity = await getWorktreeActivity(
            project(),
            "feature/coverage",
            "main",
            42,
        );
        expect(pullRequestActivity.integration).toMatchObject({
            reason: "not-authenticated",
            status: "unavailable",
        });
    });
});
