import type { WorktreeActivityItem } from "@/types/pr-run";

export type ActivitySide = "left" | "neutral" | "right";

export function resolveActivitySide(
    item: WorktreeActivityItem,
    pullRequestAuthorLogin?: string,
): ActivitySide {
    const normalizedPullRequestAuthorLogin = normalizeLogin(
        pullRequestAuthorLogin,
    );

    if (!normalizedPullRequestAuthorLogin) {
        return "neutral";
    }

    return normalizeLogin(activityAuthorLogin(item)) ===
        normalizedPullRequestAuthorLogin
        ? "left"
        : "right";
}

function activityAuthorLogin(item: WorktreeActivityItem) {
    if (item.type === "commit") {
        return item.commit.authorLogin;
    }

    if (item.type === "comment") {
        return item.comment.author.login;
    }

    return item.review.author.login;
}

function normalizeLogin(login?: string) {
    return login?.trim().toLowerCase() || undefined;
}
