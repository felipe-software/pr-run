export function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(date);
}

export function shortenPath(value: string) {
    const parts = value.split("/");

    if (parts.length <= 4) {
        return value;
    }

    return `.../${parts.slice(-3).join("/")}`;
}

export function formatBranchAge(timestamp: number | null) {
    if (!timestamp) {
        return "no activity";
    }

    const diffSeconds = Math.max(
        1,
        Math.floor((Date.now() - timestamp) / 1000),
    );
    const minute = 60;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;

    if (diffSeconds < minute) {
        return `${diffSeconds}s`;
    }

    if (diffSeconds < hour) {
        return `${Math.floor(diffSeconds / minute)}m`;
    }

    if (diffSeconds < day) {
        return `${Math.floor(diffSeconds / hour)}h`;
    }

    if (diffSeconds < week) {
        return `${Math.floor(diffSeconds / day)}d`;
    }

    return `${Math.floor(diffSeconds / week)}w`;
}
