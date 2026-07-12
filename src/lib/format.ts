import type { DateFormatPreference } from "@/lib/hooks/store/use-ui-preferences-store";

export function formatDate(
    value: string,
    format: DateFormatPreference = "dd/mm/yyyy",
) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    const parts = {
        day: String(date.getDate()).padStart(2, "0"),
        month: String(date.getMonth() + 1).padStart(2, "0"),
        year: String(date.getFullYear()),
    };
    const formattedDate = {
        "dd/mm/yyyy": `${parts.day}/${parts.month}/${parts.year}`,
        "mm/dd/yyyy": `${parts.month}/${parts.day}/${parts.year}`,
        "mm-dd-yyyy": `${parts.month}-${parts.day}-${parts.year}`,
        "yyyy-mm-dd": `${parts.year}-${parts.month}-${parts.day}`,
    }[format];
    const time = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);

    return `${formattedDate}, ${time}`;
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
