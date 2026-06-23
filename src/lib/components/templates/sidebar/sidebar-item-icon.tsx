import { GitBranch, GitPullRequest } from "lucide-react";

import { getSidebarItemStatus } from "@/lib/components/templates/sidebar/sidebar-item-status";
import type { BranchInfo } from "@/types/pr-run";

type SidebarItemIconProps = {
    branch: BranchInfo;
};

export function SidebarItemIcon({ branch }: SidebarItemIconProps) {
    const status = getSidebarItemStatus(branch);

    return (
        <span
            className={[
                "grid h-5 w-5 flex-none place-items-center rounded-md",
                status.iconClassName,
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
