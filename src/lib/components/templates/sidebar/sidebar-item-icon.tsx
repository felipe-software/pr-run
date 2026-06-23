import { GitBranch, GitPullRequest } from "lucide-react";

import type { BranchInfo } from "@/types/pr-run";

type SidebarItemIconProps = {
    branch: BranchInfo;
};

export function SidebarItemIcon({ branch }: SidebarItemIconProps) {
    return (
        <span
            className={[
                "grid h-5 w-5 flex-none place-items-center rounded-md",
                branch.isStale
                    ? "bg-warning/15 text-warning-foreground"
                    : branch.hasWorktree
                      ? "bg-success/15 text-success"
                      : branch.source === "pull-request"
                        ? "bg-blue-500/20 text-blue-600 dark:text-blue-300"
                      : "bg-muted/45 text-muted-foreground/75",
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
