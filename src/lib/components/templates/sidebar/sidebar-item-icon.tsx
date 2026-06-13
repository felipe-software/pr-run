import { GitBranch } from "lucide-react";

import type { BranchInfo } from "@/types/pr-run";

const RECENT_WINDOW_MS = 12 * 60 * 60 * 1_000;

type SidebarItemIconProps = {
    branch: BranchInfo;
};

export function SidebarItemIcon({ branch }: SidebarItemIconProps) {
    const markerClassName = getMarkerClassName(branch);

    return (
        <span className={["tree-branch-marker", markerClassName].join(" ")}>
            <GitBranch className="tree-icon" />
        </span>
    );
}

function getMarkerClassName(branch: BranchInfo) {
    if (branch.hasWorktree) {
        return "tree-branch-marker-worktree";
    }

    if (isRecentlyUpdated(branch.lastCommitTimestamp)) {
        return "tree-branch-marker-recent";
    }

    return "tree-branch-marker-idle";
}

function isRecentlyUpdated(lastCommitTimestamp: number | null) {
    if (!lastCommitTimestamp) {
        return false;
    }

    return Date.now() - lastCommitTimestamp <= RECENT_WINDOW_MS;
}
