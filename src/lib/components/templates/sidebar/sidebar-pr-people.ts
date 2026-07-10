import type {
    GitHubUserInfo,
    PullRequestInfo,
    PullRequestReviewState,
} from "@/types/pr-run";

const MAX_VISIBLE_RELATED_PEOPLE = 4;

type MergedPullRequestPerson = {
    isAssignee: boolean;
    isReviewRequested: boolean;
    reviewState?: PullRequestReviewState;
    user: GitHubUserInfo;
};

export type SidebarPullRequestPerson = {
    roleLabel: string;
    user: GitHubUserInfo;
};

export type SidebarPullRequestPeople = {
    overflowCount: number;
    people: SidebarPullRequestPerson[];
};

const reviewStateLabels: Record<PullRequestReviewState, string> = {
    APPROVED: "Approved",
    CHANGES_REQUESTED: "Changes requested",
    COMMENTED: "Commented",
    DISMISSED: "Dismissed",
    PENDING: "Pending",
};

export function getSidebarPullRequestPeople(
    pullRequest: PullRequestInfo,
): SidebarPullRequestPeople {
    const authorLogin = pullRequest.author?.login;
    const peopleByLogin = new Map<string, MergedPullRequestPerson>();

    const getPerson = (user: GitHubUserInfo) => {
        const existingPerson = peopleByLogin.get(user.login);

        if (existingPerson) {
            return existingPerson;
        }

        const person: MergedPullRequestPerson = {
            isAssignee: false,
            isReviewRequested: false,
            user,
        };
        peopleByLogin.set(user.login, person);
        return person;
    };

    for (const reviewer of pullRequest.reviewRequests) {
        if (reviewer.login !== authorLogin) {
            getPerson(reviewer).isReviewRequested = true;
        }
    }

    for (const review of pullRequest.latestReviews) {
        if (review.author.login !== authorLogin) {
            getPerson(review.author).reviewState = review.state;
        }
    }

    for (const assignee of pullRequest.assignees) {
        if (assignee.login !== authorLogin) {
            getPerson(assignee).isAssignee = true;
        }
    }

    const people = [...peopleByLogin.values()].map((person) => ({
        roleLabel: getRoleLabel(person),
        user: person.user,
    }));

    return {
        overflowCount: Math.max(0, people.length - MAX_VISIBLE_RELATED_PEOPLE),
        people: people.slice(0, MAX_VISIBLE_RELATED_PEOPLE),
    };
}

function getRoleLabel(person: MergedPullRequestPerson) {
    let label = "Assignee";

    if (person.isReviewRequested) {
        label = "Review requested";
    } else if (person.reviewState) {
        label = reviewStateLabels[person.reviewState];
    }

    if (person.isAssignee && (person.isReviewRequested || person.reviewState)) {
        return `${label}, assignee`;
    }

    return label;
}
