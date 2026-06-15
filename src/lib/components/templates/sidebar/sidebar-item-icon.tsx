import { GitBranch, GitPullRequest } from "lucide-react";

import type { BranchInfo } from "@/types/pr-run";

type SidebarItemIconProps = {
    branch: BranchInfo;
};

export function SidebarItemIcon({ branch }: SidebarItemIconProps) {
    const markerClassName = getMarkerClassName(branch);

    return (
        <span
            className={[
                "grid h-5 w-5 flex-none place-items-center rounded-md",
                markerClassName,
            ].join(" ")}
        >
            {branch.source === "pull-request" ? (
                <GitPullRequest className="h-3.5 w-3.5" />
            ) : (
                <GitBranch className="h-3.5 w-3.5" />
            )}
        </span>
    );
}

function getMarkerClassName(branch: BranchInfo) {
    if (branch.hasWorktree) {
        return "bg-success/15 text-success";
    }

    if (branch.source === "pull-request") {
        return "bg-blue-500/20 text-blue-600 dark:text-blue-300";
    }

    return "bg-muted/45 text-muted-foreground/75";
}
