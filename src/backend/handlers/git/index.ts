import {
    checkoutBranch,
    listBranches,
    removeWorktree,
    updateProjectWorktrees,
    updateWorktree,
} from "@/backend/handlers/git/worktrees";
import { getBranchDiff } from "@/backend/handlers/git/diff";
import { getCommitHistory } from "@/backend/handlers/git/history";
import { getOverviewSnapshot } from "@/backend/handlers/git/overview";
import { validateProjectPath } from "@/backend/handlers/git/helpers";

export const gitHandler = {
    checkoutBranch,
    getBranchDiff,
    getCommitHistory,
    getOverviewSnapshot,
    listBranches,
    removeWorktree,
    updateProjectWorktrees,
    updateWorktree,
    validateProjectPath,
};
