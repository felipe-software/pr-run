import { useState, type ReactElement } from "react";

import {
    Tooltip,
    TooltipPopup,
    TooltipTrigger,
} from "@/lib/components/ui/tooltip";
import { getSidebarPullRequestPeople } from "@/lib/components/templates/sidebar/sidebar-pr-people";
import { getPullRequestSidebarStatus } from "@/lib/components/templates/sidebar/sidebar-item-status";
import { cn } from "@/lib/utils/cn";
import type { GitHubUserInfo, PullRequestInfo } from "@/types/pr-run";

type SidebarPrPeopleTooltipProps = {
    children: ReactElement;
    pullRequest: PullRequestInfo;
};

type SidebarPrAuthorAvatarProps = {
    className?: string;
    user: GitHubUserInfo;
};

export function SidebarPrPeopleTooltip({
    children,
    pullRequest,
}: SidebarPrPeopleTooltipProps) {
    const relatedPeople = getSidebarPullRequestPeople(pullRequest);
    const status = getPullRequestSidebarStatus(pullRequest);

    return (
        <Tooltip>
            <TooltipTrigger delay={0} render={children} />
            <TooltipPopup
                align="start"
                className="w-64 max-w-[calc(100vw-1rem)] p-2"
                side="right"
                sideOffset={8}
            >
                <div className="border-border/70 border-b pb-2">
                    <div
                        className="text-muted-foreground text-[10px]
                            font-medium"
                    >
                        PR #{pullRequest.number} · {status.label}
                    </div>
                    <div
                        className="mt-0.5 line-clamp-2 text-xs leading-4
                            font-semibold"
                    >
                        {pullRequest.title}
                    </div>
                </div>
                <div className="mt-2 grid gap-1.5">
                    {pullRequest.author ? (
                        <PullRequestPerson
                            roleLabel="Author"
                            user={pullRequest.author}
                        />
                    ) : null}
                    {relatedPeople.people.map((person) => (
                        <PullRequestPerson
                            key={person.user.login}
                            roleLabel={person.roleLabel}
                            user={person.user}
                        />
                    ))}
                    {relatedPeople.overflowCount > 0 ? (
                        <div className="text-muted-foreground pl-6 text-[10px]">
                            +{relatedPeople.overflowCount} more
                        </div>
                    ) : null}
                </div>
            </TooltipPopup>
        </Tooltip>
    );
}

export function SidebarPrAuthorAvatar({
    className,
    user,
}: SidebarPrAuthorAvatarProps) {
    return (
        <SidebarUserAvatar className={cn("size-5", className)} user={user} />
    );
}

function PullRequestPerson({
    roleLabel,
    user,
}: {
    roleLabel: string;
    user: GitHubUserInfo;
}) {
    return (
        <div
            className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center
                gap-1.5"
        >
            <SidebarUserAvatar className="size-5" user={user} />
            <div className="min-w-0 leading-3.5">
                <div className="truncate text-[11px] font-medium">
                    {user.login}
                </div>
                <div className="text-muted-foreground truncate text-[10px]">
                    {roleLabel}
                </div>
            </div>
        </div>
    );
}

function SidebarUserAvatar({
    className,
    user,
}: {
    className?: string;
    user: GitHubUserInfo;
}) {
    const [failedImageUrl, setFailedImageUrl] = useState<string>();

    if (failedImageUrl !== user.avatarUrl) {
        return (
            <img
                alt=""
                className={cn(
                    "border-border rounded-md border object-cover",
                    className,
                )}
                src={user.avatarUrl}
                onError={() => setFailedImageUrl(user.avatarUrl)}
            />
        );
    }

    const initials = user.login.slice(0, 2).toUpperCase();

    return (
        <span
            aria-hidden="true"
            className={cn(
                `bg-muted text-muted-foreground grid place-items-center
                rounded-md text-[8px] font-semibold`,
                className,
            )}
        >
            {initials || "?"}
        </span>
    );
}
