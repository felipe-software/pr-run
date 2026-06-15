import { GitBranch, GitPullRequest } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import type { BranchInfo } from "@/types/pr-run";

const RECENT_WINDOW_MS = 12 * 60 * 60 * 1_000;

type SidebarItemIconProps = {
    branch: BranchInfo;
};

export function SidebarItemIcon({ branch }: SidebarItemIconProps) {
    const markerClassName = getMarkerClassName(branch);

    return (
        <span
            className={cn(
                "relative z-[1] grid h-[22px] w-[22px] flex-none place-items-center rounded-full border",
                markerClassName,
            )}
        >
            {branch.source === "pull-request" ? (
                <GitPullRequest className="h-[13px] w-[13px]" />
            ) : (
                <GitBranch className="h-[13px] w-[13px]" />
            )}
        </span>
    );
}

function getMarkerClassName(branch: BranchInfo) {
    if (branch.hasWorktree) {
        return "border-success bg-success text-black";
    }

    if (isRecentlyUpdated(branch.lastCommitTimestamp)) {
        return "border-blue-300/20 bg-blue-300/15 text-blue-100";
    }

    return "border-border bg-muted/10 text-foreground";
}

function isRecentlyUpdated(lastCommitTimestamp: number | null) {
    if (!lastCommitTimestamp) {
        return false;
    }

    return Date.now() - lastCommitTimestamp <= RECENT_WINDOW_MS;
}
