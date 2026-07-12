import dayjs from "dayjs";
import type { DateFormatPreference } from "@/lib/hooks/store/use-ui-preferences-store";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatActivityRelativeTime(value: string, now = Date.now()) {
    const date = dayjs(value);

    if (!date.isValid()) {
        return value;
    }

    const difference = date.valueOf() - now;
    const absoluteDifference = Math.abs(difference);

    if (absoluteDifference < SECOND) {
        return "now";
    }

    const [amount, unit] = getRelativeUnit(absoluteDifference);
    const label = `${amount} ${unit}${amount === 1 ? "" : "s"}`;

    return difference > 0 ? `in ${label}` : `${label} ago`;
}

export function formatActivityAbsoluteTime(
    value: string,
    format: DateFormatPreference = "dd/mm/yyyy",
) {
    const date = dayjs(value);

    if (!date.isValid()) {
        return value;
    }

    const datePattern = {
        "dd/mm/yyyy": "DD/MM/YYYY",
        "mm/dd/yyyy": "MM/DD/YYYY",
        "mm-dd-yyyy": "MM-DD-YYYY",
        "yyyy-mm-dd": "YYYY-MM-DD",
    }[format];

    return date.format(`${datePattern} [at] HH:mm:ss`);
}

export function getActivityTimeRefreshDelay(
    value: string,
    now = Date.now(),
): number | null {
    const date = dayjs(value);

    if (!date.isValid()) {
        return null;
    }

    const difference = date.valueOf() - now;
    const absoluteDifference = Math.abs(difference);
    const interval = getRefreshInterval(absoluteDifference);
    const remainder = absoluteDifference % interval;
    const boundaryDelay =
        difference > 0
            ? remainder || interval
            : interval - remainder || interval;

    return Math.max(50, boundaryDelay + 20);
}

function getRelativeUnit(difference: number): [number, string] {
    if (difference < MINUTE) {
        return [Math.floor(difference / SECOND), "second"];
    }

    if (difference < HOUR) {
        return [Math.floor(difference / MINUTE), "minute"];
    }

    if (difference < DAY) {
        return [Math.floor(difference / HOUR), "hour"];
    }

    if (difference < MONTH) {
        return [Math.floor(difference / DAY), "day"];
    }

    if (difference < YEAR) {
        return [Math.floor(difference / MONTH), "month"];
    }

    return [Math.floor(difference / YEAR), "year"];
}

function getRefreshInterval(difference: number) {
    if (difference < MINUTE) {
        return SECOND;
    }

    if (difference < HOUR) {
        return MINUTE;
    }

    if (difference < DAY) {
        return HOUR;
    }

    return DAY;
}
