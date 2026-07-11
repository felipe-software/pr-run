export const ACTIVITY_BOTTOM_TOLERANCE = 96;
export const ACTIVITY_HEADER_COMPACT_ENTER = 96;
export const ACTIVITY_HEADER_COMPACT_EXIT = 24;

export type ActivityScrollMetrics = {
    clientHeight: number;
    scrollHeight: number;
    scrollTop: number;
};

export type ActivityRefreshAction = "initialize" | "notify" | "pin";

export function getActivityBottomDistance({
    clientHeight,
    scrollHeight,
    scrollTop,
}: ActivityScrollMetrics) {
    return Math.max(0, scrollHeight - clientHeight - scrollTop);
}

export function isActivityNearBottom(
    metrics: ActivityScrollMetrics,
    tolerance = ACTIVITY_BOTTOM_TOLERANCE,
) {
    return getActivityBottomDistance(metrics) <= tolerance;
}

export function resolveActivityRefreshAction({
    isInitialized,
    wasNearBottom,
}: {
    isInitialized: boolean;
    wasNearBottom: boolean;
}): ActivityRefreshAction {
    if (!isInitialized) {
        return "initialize";
    }

    return wasNearBottom ? "pin" : "notify";
}

export function resolveActivityHeaderCompact(
    isCompact: boolean,
    scrollTop: number,
) {
    return isCompact
        ? scrollTop > ACTIVITY_HEADER_COMPACT_EXIT
        : scrollTop >= ACTIVITY_HEADER_COMPACT_ENTER;
}
