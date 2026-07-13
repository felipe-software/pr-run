import type {
    BranchInfo,
    CheckoutResult,
    ProjectConfig,
    ProjectsConfig,
    RemoveWorktreeResult,
    UpdateResult,
    UpdateWorktreesResult,
} from "@/types/pr-run";
import { requestMany, requestOne } from "./transport";

export const projectApi = {
    addProject(projectPath: string) {
        return requestOne<ProjectConfig>("/projects", {
            json: { path: projectPath },
            method: "POST",
        });
    },
    checkoutBranch(projectId: string, branch: string) {
        return requestOne<CheckoutResult>(projectPath(projectId, "/checkout"), {
            json: { branch },
            method: "POST",
        });
    },
    getConfig() {
        return requestOne<ProjectsConfig>("/config");
    },
    listBranches(projectId: string) {
        return requestMany<BranchInfo>(projectPath(projectId, "/branches"));
    },
    removeWorktree(projectId: string, branch: string) {
        return requestOne<RemoveWorktreeResult>(
            projectPath(projectId, "/worktree"),
            { json: { branch }, method: "DELETE" },
        );
    },
    updateProjectWorktrees(projectId: string) {
        return requestOne<UpdateWorktreesResult>(
            projectPath(projectId, "/update-worktrees"),
            { method: "POST" },
        );
    },
    updateWorktree(projectId: string, branch: string) {
        return requestOne<UpdateResult>(projectPath(projectId, "/update"), {
            json: { branch },
            method: "POST",
        });
    },
};

export function projectPath(projectId: string, suffix = "") {
    return `/projects/${encodeURIComponent(projectId)}${suffix}`;
}
