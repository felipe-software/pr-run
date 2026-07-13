import type { BranchInfo } from "@/types/pr-run";

export type SidebarBranchPendingAction =
    | { type: "checking-out" }
    | { type: "idle" }
    | { type: "removing" };

type GetSidebarBranchPendingActionParams = {
    branch: Pick<BranchInfo, "hasWorktree" | "name">;
    pendingWorktreeCheckoutKey?: string;
    pendingWorktreeRemovalKey?: string;
    projectId: string;
};

export function getSidebarBranchPendingAction({
    branch,
    pendingWorktreeCheckoutKey,
    pendingWorktreeRemovalKey,
    projectId,
}: GetSidebarBranchPendingActionParams): SidebarBranchPendingAction {
    const branchKey = `${projectId}:${branch.name}`;

    if (branch.hasWorktree && pendingWorktreeRemovalKey === branchKey) {
        return { type: "removing" };
    }

    if (!branch.hasWorktree && pendingWorktreeCheckoutKey === branchKey) {
        return { type: "checking-out" };
    }

    return { type: "idle" };
}
