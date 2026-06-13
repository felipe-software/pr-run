import {
    checkoutBranch,
    listBranches,
    removeWorktree,
    updateProjectWorktrees,
    updateWorktree,
} from "@/backend/handlers/git/worktrees";
import { getBranchDiff } from "@/backend/handlers/git/diff";
import { getCommitHistory } from "@/backend/handlers/git/history";
import { validateProjectPath } from "@/backend/handlers/git/helpers";

export const gitHandler = {
    checkoutBranch,
    getBranchDiff,
    getCommitHistory,
    listBranches,
    removeWorktree,
    updateProjectWorktrees,
    updateWorktree,
    validateProjectPath,
};
